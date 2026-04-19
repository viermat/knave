// ==UserScript==
// @name         Knave
// @version      3.2
// @description  SimpleMMO toolkit
// @author       viermat (https://github.com/viermat)
// @match        https://web.simple-mmo.com/*
// @icon         https://web.simple-mmo.com/favicon-32x32.png
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @noframes
// ==/UserScript==

/**
 * Create and act inside an iframe
 * @param {String} url iframe url
 * @param {Function} callback Callback function that executes inside iframe (args: document, window)
 */
async function subDoc(url, callback) {
	return new Promise((resolve) => {
		let tempFrame = document.createElement("iframe");
		tempFrame.setAttribute("src", url);
		tempFrame.setAttribute("style", "display: none");
		document.body.appendChild(tempFrame);

		tempFrame.addEventListener("load", async () => {
			await callback(tempFrame.contentDocument, tempFrame.contentWindow);

			tempFrame.remove();

			resolve();
		});
	});
}

/**
 * Asynchronous query to find an element
 * @param {String} query Query string
 * @param {Document} doc Document scope
 * @returns {Promise<Element>} Resolved element
 */
async function asyncQuery(query, doc = document) {
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			const queryEl = doc.querySelector(query);

			if (queryEl) {
				clearInterval(interval);
				clearTimeout(timer);

				resolve(queryEl);
			}
		}, 100);

		const timer = setTimeout(() => clearInterval(interval), 5000);
	});
}

/**
 * Get player data from internal API
 * @returns {JSON} Player data
 */
async function getPlayerData() {
	return new Promise((resolve) => {
		fetch("/api/web-app")
			.then((response) => response.json())
			.then((data) => resolve(data));
	});
}

/**
 * Asynchronous sleep function
 * @param {Number} ms Sleep time in milliseconds
 * @returns {Promise<null>} Resolved when sleep has finished
 */
async function asyncWait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Safeguard for displayToast gravity
while (!unsafeWindow.game_data?.settings)
	await new Promise((r) => setTimeout(r, 100));

/**
 * Display toast
 * @param {String} text Toast text
 * @param {String} type Toast type (info, success, error, null)
 * @param {Number} timeout Toast timeout (in seconds)
 */
function t_displayToast(text, type = "info", timeout = 1) {
	displayToast(text, null, type, timeout * 1000);
}

/**
 * Display toast with icon
 * @param {String} src URL Source of toast icon
 * @param {String} text Toast text
 * @param {String} type Toast type (info, success, error, null)
 * @param {Number} timeout Toast timeout (in seconds)
 * @param {boolean} [bottom=false] Turn gravity to bottom
 */
function i_displayToast(src, text, type, timeout, bottom = false) {
	if (bottom) unsafeWindow.game_data.settings.toast_position = "bottom_left";

	let size = 20;

	t_displayToast(
		`<img width="${size}" height="${size}" src=${src} /> ${text}`,
		type,
		timeout,
	);

	if (bottom) unsafeWindow.game_data.settings.toast_position = null;
}

/**
 * Change action button state
 * @param {Element} button Action button
 * @param {Boolean} [enabled="false"] enabled Revert to original state
 */
function changeState(button, enabled = false) {
	if (enabled) {
		button.classList.add("hover:text-gray-900");
		button.classList.remove("dark:text-gray-600");
		button.classList.add("dark:text-gray-300");
	} else {
		button.classList.remove("hover:text-gray-900");
		button.classList.remove("dark:text-gray-300");
		button.classList.add("dark:text-gray-600");
	}
}

/**
 * Search for an element with a condition
 * @param {Function} handler Handler function (arg: Element)
 * @param {String} queryElem Element query
 * @param {Document} doc Document scope
 */
function condSearch(handler, queryElem = "*", doc = document) {
	return Array.from(doc.querySelectorAll(queryElem)).find(handler);
}

/**
 * Text-only condSearch
 * @param {String} searchStr Search string (inclusion-based, not equivalency)
 * @param {String} queryElem Element query
 * @param {Document} doc Document scope
 * @returns
 */
function textSearch(searchStr, queryElem = "*", doc = document) {
	return condSearch((e) => e.textContent.includes(searchStr), queryElem, doc);
}

const ICONS = {
	Attack: "/img/icons/W_Axe008.png",
	Boss: "/img/sprites/bosses/16.png",
	Energy: "/img/icons/S_Thunder01.png",
	Book: "/img/icons/W_Book01.png",
};

async function pilgrim() {
	if (/travel*/g.test(location.href)) {
		// Create action button
		const btnOld = textSearch("Inventory", "span");

		const btn = btnOld.parentElement.cloneNode(true);
		btnOld.parentElement.parentElement.appendChild(btn);

		// Action button's text element
		const btnSpan = btn.querySelector("span");

		// "Take a Step" button
		const stepBtn = condSearch(
			(e) => e.id.startsWith("step_btn"),
			"button",
		);

		var timeSpent = 0;
		var stepCount = 0;
		var killCount = 0;

		function switchState() {
			window.isOn = !window.isOn;

			if (window.isOn) {
				if (timeSpent == 0) timeSpent = new Date();

				changeState(btn);
				travel();
			} else {
				changeState(btn, true);

				if (stepCount > 5) {
					let totalSeconds = Math.floor(
						(Date.now() - timeSpent) / 1000,
					);

					Swal.fire({
						title: "Journey completed",
						type: "success",
						html: `<div style="text-align: center">Steps: ${stepCount}
						<br>NPCs killed: ${killCount}
						<br>Time stepping: ${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s
						</div>`,
						timer: 15 * 1000,
					});
				}

				timeSpent = 0;
				stepCount = 0;
				killCount = 0;
			}
		}

		// MutObs for other things
		new MutationObserver(async (mList) => {
			for (const m of mList) {
				if (m.type === "childList" && window.isOn) {
					let npc = null;

					// Check only for added nodes
					for (const node of m.addedNodes) {
						if (!(node instanceof HTMLElement)) continue;

						// Auto wave
						const waveEl =
							node.matches("span") &&
							node.textContent.includes("Wave")
								? node
								: node.querySelector?.("span");

						if (waveEl && waveEl.textContent.includes("Wave")) {
							waveEl.click();
							waveEl.parentElement.remove();
						}

						// Kill if bot detection
						const botEl =
							node.matches("a") &&
							node.textContent.includes("I'm a person! Promise!")
								? node
								: node.querySelector?.("a");

						if (
							botEl &&
							botEl.textContent.includes("I'm a person! Promise!")
						) {
							window.isOn = false;
							changeState(btn, true);

							Swal.fire({
								title: "Warning",
								type: "warning",

								text: "Pilgrim has stopped. Complete human verification and turn on again",
							});

							return;
						}

						// Check for NPCs
						if (!npc) {
							const npcEl =
								node.matches("a") &&
								node.textContent.includes("Attack")
									? node
									: node.querySelector?.("a");

							if (npcEl && npcEl.textContent.includes("Attack")) {
								npc = npcEl;
							}
						}
					}

					// Auto NPC killer
					if (npc && !npc?.disabled) {
						window.attacking = true;

						await subDoc(
							npc.href.split("?")[0],
							async (doc, win) => {
								let npcDefeated = false;

								// Monkeypatch fetch
								const oldFetch = win.fetch;

								win.fetch = async (...args) => {
									const res = await oldFetch.apply(win, args);

									try {
										const url =
											typeof args[0] === "string"
												? args[0]
												: args[0].url;

										if (
											url.startsWith(
												"https://web.simple-mmo.com/api/npcs/attack/",
											)
										) {
											const data = await res
												.clone()
												.json();

											let type = res?.type;

											if (type) {
												npcDefeated = true;

												npc.remove();

												if (data.type == "success") {
													i_displayToast(
														doc.querySelector(
															"img#npc_avatar",
														).src,
														`Killed ${condSearch((e) => /\/npcs\/view/g.test(e.href), "a", doc).textContent}`,
														"success",
														5,
														true,
													);

													killCount++;
												} else {
													if (
														data.title.includes(
															"defeated",
														)
													) {
														t_displayToast(
															`Died atacking: ${data.title}`,
															"error",
															5,
														);
													} else {
														t_displayToast(
															`Error attacking: ${data.title}`,
															"error",
															10,
														);

														console.error(data);
													}
												}
											}
										}
									} catch {}

									return res;
								};

								while (!npcDefeated) {
									const attackBtn = condSearch(
										(e) => e.textContent.trim() == "Attack",
										"button",
										doc,
									);

									if (!attackBtn) break;
									attackBtn.click();

									await asyncWait(
										500 + Math.floor(Math.random() * 500),
									);
								}
							},
						);

						window.attacking = false;
					}
				}
			}
		}).observe(document.querySelector('div[class="px-4 py-3"]'), {
			childList: true,
			subtree: true,
		});

		// Step button function
		async function travel() {
			if (!stepBtn.disabled && window.isOn && !window.attacking) {
				await asyncWait(400 + Math.floor(Math.random() * 500));

				window.fakeX = 800 + Math.floor(Math.random() * 90);
				window.fakeY = 880 + Math.floor(Math.random() * 30);

				stepBtn.click();

				stepCount++;
			}
		}

		// MutObs for other things
		new MutationObserver(async (mList) => {
			for (const m of mList) {
				if (m.type === "attributes") travel();
			}
		}).observe(stepBtn, {
			attributes: true,
			attributeFilter: ["disabled"],
		});

		// Stylize action button
		btnSpan.textContent = "Pilgrim";
		btn.style.cursor = "pointer";

		// Repurpose "a" element into a button
		btn.removeAttribute("href");
		btn.addEventListener("click", () => switchState());

		// Modify request before it's sent so mouse position corresponds
		const oldFetch = unsafeWindow.fetch;

		unsafeWindow.fetch = async (...args) => {
			const url = typeof args[0] === "string" ? args[0] : args[0].url;

			if (
				url.startsWith("https://api.simple-mmo.com/api/action/travel/4")
			) {
				let params = args[1].body;

				params.set("s", "false");
				params.set("d_1", window.fakeX || 830);
				params.set("d_2", window.fakeY || 890);
			}

			return oldFetch(...args);
		};
	}
}

async function warden() {
	// Check for API key
	if (!GM_getValue("api_key")) {
		await subDoc("https://web.simple-mmo.com/p-api/home", (doc) => {
			GM_setValue(
				"api_key",
				condSearch((e) => e.type == "text", "input", doc).value,
			);

			location.reload();
		});
	}

	const API_URL = "https://api.simple-mmo.com/v1/";
	const postReq = async (url) => {
		return fetch(API_URL + url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},

			body: JSON.stringify({
				api_key: GM_getValue("api_key"),
			}),
		}).then((r) => {
			return r.json();
		});
	};

	// Cache system
	if (
		!GM_getValue("warden_cache") ||
		GM_getValue("warden_cache").stats.error
	) {
		await postReq("player/me").then((s) => {
			GM_setValue("warden_cache", {
				lastCache: new Date().getTime(),
				stats: s,
			});
		});
	}

	// URL Path array
	var argArr = location.href.split("/");

	// Check if user is attacking another user
	if (/\/user\/attack\/[0-9]+/g.test(location.href)) {
		if (GM_getValue("warden_cache")) {
			let diff =
				new Date(GM_getValue("warden_cache").lastCache) - new Date();

			if (diff <= -2 * 60 * 1000) {
				await postReq("player/me").then((s) => {
					GM_setValue("warden_cache", {
						lastCache: new Date().getTime(),
						stats: s,
					});
				});
			}
		}

		// Calculate user's and opponents' strength and defence
		const meData = GM_getValue("warden_cache").stats;
		const meStr = meData.str + meData.bonus_str;
		const meDef = meData.def + meData.bonus_def;

		const oppData = await postReq(
			"player/info/" + argArr[argArr.length - 1],
		);
		const oppStr = oppData.str + oppData.bonus_str;
		const oppDef = oppData.def + oppData.bonus_def;

		i_displayToast(meData.avatar, `You: ${meStr} / ${meDef}`, "success", 5);
		i_displayToast(
			oppData.avatar,
			`Opponent: ${oppStr} / ${oppDef}`,
			"error",
			5,
		);

		// Check if opponent is 10% stronger than user
		if (meDef + meDef * 0.1 < oppStr || meStr < oppDef + oppDef * 0.1) {
			Swal.fire({
				title: "Warning",
				imageUrl: oppData.avatar,
				imageHeight: 64,

				html: "This player's stats are higher than yours. You might be defeated!",

				showCancelButton: true,
				confirmButtonColor: "#3085d6",
				confirmButtonText: "Go back",
			}).then((result) => {
				if (result.value) window.history.back();
			});
		}
	}
}

async function envoy() {
	/**
	 * Get date when boss is attackable
	 * @param {String} timeLeft Unparsed string for time left until boss is attackable
	 * @returns {Date} Parsed date
	 */
	function parseTime(timeLeft) {
		const timeArr = timeLeft.split(/[a-z]+/);

		let secs = 0;

		secs += /([0-9]+)/g.exec(timeArr[0])[1] * 24 * 60 ** 2 || 0;
		secs += /([0-9]+)/g.exec(timeArr[1])[1] * 60 ** 2 || 0;
		secs += /([0-9]+)/g.exec(timeArr[2])[1] * 60 || 0;

		let returnDate = new Date();
		returnDate.setSeconds(returnDate.getSeconds() + secs);

		return returnDate.getTime();
	}

	/**
	 * Create cache for world bosses
	 * @returns {Object[]} Parsed bosses array
	 */
	function cacheBosses() {
		return new Promise((resolve) => {
			const bossArr = [];

			// Collect world bosses into cache
			subDoc("https://web.simple-mmo.com/battle/world-bosses", (doc) => {
				// Push earliest boss first
				let earliestBoss = doc.querySelector(
					"div.p-4 > div > div.ml-3",
				);

				bossArr.push({
					name: earliestBoss
						.querySelector(".text-gray-900")
						.textContent.trim(),
					level: textSearch(
						"Level",
						"p",
						earliestBoss,
					).textContent.trim(),
					avatar: earliestBoss.parentElement.querySelector(
						"div.flex-shrink-0 > img",
					).src,
					date: parseTime(
						earliestBoss
							.querySelector("p.text-gray-400")
							.textContent.trim(),
					),
				});

				// Push rest of the bosses
				doc.querySelectorAll(
					"div.truncate > div:nth-child(3) > div",
				).forEach((e) => {
					let mainDiv = e.closest(".truncate");

					bossArr.push({
						name: mainDiv
							.querySelector(".font-bold")
							.textContent.trim(),
						level: mainDiv
							.querySelector(".font-normal")
							.textContent.trim(),
						avatar: condSearch(
							(e) => 1,
							"img",
							mainDiv.parentElement,
						),
						date: parseTime(e.textContent.trim()),
					});
				});

				resolve(bossArr);
			});
		});
	}

	// Cache system
	if (!GM_getValue("boss_cache")) {
		await cacheBosses().then((b) => {
			GM_setValue("boss_cache", {
				lastCache: new Date().getTime(),
				bosses: b,
			});
		});
	} else {
		let diff = new Date(GM_getValue("boss_cache").lastCache) - new Date();

		if (diff <= -30 * 60 * 1000) {
			cacheBosses().then((b) => {
				GM_setValue("boss_cache", {
					lastCache: new Date().getTime(),
					bosses: b,
				});
			});
		}
	}

	// Default settings
	if (!GM_getValue("timeout")) GM_setValue("timeout", 30);
	if (!GM_getValue("interval")) GM_setValue("interval", 2);

	GM_registerMenuCommand(
		"Set when upcoming world boss notification start",
		function () {
			let value = prompt(
				"Set how soon the notifications should start (in minutes)",
				30,
			);

			if (value) GM_setValue("timeout", value);
		},
	);

	GM_registerMenuCommand(
		"Set upcoming world boss notification interval",
		function () {
			let value = prompt(
				"Set how often the notification should appear when the world boss is soon (in minutes)",
				2,
			);

			if (value) GM_setValue("interval", value);
		},
	);

	/**
	 * Check if any boss needs a notification
	 * @param {Object[]} bosses Parsed bosses list
	 * @param {Number} timeout How much time before notification (in minutes)
	 * @param {Number} [toastTimeout=15] Toast timeout (in seconds)
	 */
	function handleNotify(bosses, timeout, toastTimeout = 15) {
		bosses.forEach((b) => {
			b.date = new Date(b.date);

			let diff = b.date - new Date();

			if (diff >= 0 && diff <= timeout * 60 * 1000) {
				i_displayToast(
					b.avatar,
					`${b.name} (${b.level}) at ${b.date
						.getHours()
						.toString()
						.padStart(2, "0")}:${b.date
						.getMinutes()
						.toString()
						.padStart(2, "0")}`,
					"info",
					toastTimeout,
					1,
				);
			}
		});
	}

	const BOSSES = GM_getValue("boss_cache").bosses;

	// First page load check
	handleNotify(BOSSES, GM_getValue("timeout"));

	// Regular check
	setInterval(
		() => handleNotify(BOSSES, GM_getValue("timeout")),
		GM_getValue("interval") * 60 * 1000,
	);
}

async function knight() {
	// Create action button
	const btnOld = textSearch("Battle", "span");

	const btn = btnOld.parentElement.cloneNode(true);
	btnOld.parentElement.parentElement.appendChild(btn);

	// Action button's text element
	const btnSpan = btn.querySelector("span");

	// Stylize action button
	btnSpan.textContent = "Knight";
	btn.style.cursor = "pointer";

	// Repurpose "a" element into a button
	btn.removeAttribute("href");
	btn.addEventListener("click", async (e) => {
		if (btn.classList.contains("disabled")) {
			e.preventDefault();
			return;
		}

		btn.classList.add("disabled");
		changeState(btn);

		// Get EP count
		const data = await getPlayerData();
		var energyPoints = data.energy;

		if (energyPoints > 0) {
			i_displayToast(ICONS.Boss, "Knight started", "success", 2);

			// Collect opponents
			async function generatePlayers(energy = 5) {
				const users = [];

				for (let i = 0; i < Math.ceil(energy / 5); i++) {
					await subDoc("/battle/colosseum", (doc) => {
						[...doc.querySelector("tbody").children].forEach(
							(e) => {
								users.push({
									id: Number(
										/[0-9]+/g.exec(
											textSearch("Attack", "a", e),
										)[0],
									),
									level: Number(
										/Level ([0-9]+)/g.exec(
											textSearch(
												"Level",
												"div",
												e,
											).textContent.replaceAll(",", ""),
										)[1],
									),
								});
							},
						);

						users.sort((a, b) => {
							return a.level - b.level;
						});
					});

					users.splice(-5);

					await asyncWait(600);
				}

				users.splice(energy);

				return users;
			}

			const targetUsers = await generatePlayers(energyPoints);

			var killCount = 0;
			let breakLoop = 0;

			if (targetUsers.length > 0) {
				for (let i = 0; i < targetUsers.length; i++) {
					if (breakLoop) break;

					await subDoc(
						"/user/attack/" + targetUsers[i].id,
						async (doc, win) => {
							let oppDefeated = false;

							// Patch XHR (no idea why attack doesn't use fetch)
							const oldSend = win.XMLHttpRequest.prototype.send;

							win.XMLHttpRequest.prototype.send = function (
								body,
							) {
								this.addEventListener(
									"load",
									async function () {
										let res = this?.responseText;

										try {
											res = JSON.parse(this.responseText);

											let type = res?.type;

											if (type) {
												oppDefeated = true;

												if (type == "success") {
													killCount++;

													i_displayToast(
														doc.querySelectorAll(
															"div#npcImg > img",
														)[1]?.src,
														`Killed ${doc.querySelectorAll("a.truncate")[0]?.textContent}`,
														"success",
														5,
														true,
													);
												} else if (type === "error") {
													if (
														res.result.includes(
															"defeated",
														)
													) {
														breakLoop = 1;

														i_displayToast(
															doc.querySelectorAll(
																"div#npcImg > img",
															)[1]?.src,
															`Died attacking ${doc.querySelectorAll("a.truncate")[0]?.textContent}`,
															"error",
															5,
															true,
														);
													} else if (
														res.result.includes(
															"half health",
														)
													) {
														i_displayToast(
															doc.querySelectorAll(
																"div#npcImg > img",
															)[1]?.src,
															`Could not attack ${doc.querySelectorAll("a.truncate")[0]?.textContent}, skipping`,
															"info",
															5,
															true,
														);

														targetUsers.concat(
															await generatePlayers(
																1,
															),
														);
													} else {
														breakLoop = 1;

														t_displayToast(
															`Error attacking: ${data.title}`,
															"error",
															10,
														);

														console.error(res);
													}
												}
											}
										} catch {}
									},
								);

								return oldSend.call(this, body);
							};

							while (!oppDefeated) {
								const attackBtn = doc.querySelector(
									"button#attackButton",
								);

								if (!attackBtn) break;
								attackBtn.click();

								await asyncWait(
									1.1 + Math.floor(Math.random() * 0.8),
								);
							}
						},
					);

					await asyncWait(1500 + Math.floor(Math.random() * 500));
				}

				i_displayToast(
					ICONS.Attack,
					`Killed ${killCount} players`,
					"success",
					5,
				);
			}
		} else {
			t_displayToast(
				"You don't have enough energy to use Knight",
				"error",
				2.5,
			);
		}

		btn.classList.remove("disabled");
		changeState(btn, true);
	});
}

async function sentinel() {
	// Create action button
	const btnOld = textSearch("Tasks", "span");

	const btn = btnOld.parentElement.cloneNode(true);
	btnOld.parentElement.parentElement.appendChild(btn);

	// Action button's text element
	const btnSpan = btn.querySelector("span");

	// Stylize action button
	btnSpan.textContent = "Sentinel";
	btn.style.cursor = "pointer";

	// Repurpose "a" element into a button
	btn.removeAttribute("href");
	btn.addEventListener("click", async (e) => {
		if (btn.classList.contains("disabled")) {
			e.preventDefault();
			return;
		}

		btn.classList.add("disabled");
		changeState(btn);

		// Enter quests
		await subDoc("/quests", async (doc) => {
			// Collect QP count
			const data = await getPlayerData();
			var questPoints = data.quest_points;

			if (questPoints > 0) {
				i_displayToast(ICONS.Book, "Sentinel started", "success", 2);

				// Elements can only be queried through classes unfortunately, no IDs or accessible text

				// Get latest quest
				let latestQuest = await asyncQuery(
					".relative.mt-4 > div > button",
					doc,
				);

				latestQuest.click();

				// Quest solver
				for (let i = 1; i <= questPoints; i++) {
					let performQuest = await asyncQuery(
						".relative.mt-2 > button",
						doc,
					);

					performQuest.click();

					await asyncWait(1400 + Math.floor(Math.random() * 500));
				}

				let img = await asyncQuery("img.h-10.w-auto", doc);
				let title = await asyncQuery("div.text-gray-800", doc);

				i_displayToast(
					img.src,
					`Perfomed ${questPoints} of "${title.textContent}"`,
					"success",
					5,
				);
			} else {
				t_displayToast(
					"You don't have enough energy to use Sentinel",
					"error",
					2.5,
				);
			}
		});

		btn.classList.remove("disabled");
		changeState(btn, true);
	});
}

async function energyMax() {
	// Only apply on tradeable and untradeable MoE "use" pages
	if (/\/inventory\/use\/(?:163049|611)/g.test(location.href)) {
		// Create "Use Max" button and stylize
		const useBtn = document.querySelector('button[type="submit"]');
		const maxBtn = useBtn.cloneNode(true);
		const btnParent = useBtn.parentElement;
		const btnInput = btnParent.querySelector("input");

		// Restyle borders
		maxBtn.classList.remove("rounded-r-md");
		maxBtn.classList.add("rounded-l-md");
		maxBtn.textContent = "Use Max";
		maxBtn.setAttribute("type", "button");

		btnInput.classList.remove("rounded-l-md");
		btnParent.prepend(maxBtn);

		maxBtn.addEventListener("click", async (e) => {
			// Calculate needed energy so no failure occurs
			const data = await getPlayerData();
			const itemCount = Number(
				/[0-9]+/g.exec(
					textSearch("of this item", "div.text-sm").textContent,
				)[0],
			);

			const neededEnergy = data.max_energy - data.energy;

			if (neededEnergy == 0) {
				i_displayToast(
					ICONS.Energy,
					"You already have max energy!",
					"error",
					2.5,
				);

				e.preventDefault();
			} else {
				btnInput.value =
					neededEnergy > itemCount ? itemCount : neededEnergy;

				useBtn.click();
			}
		});
	}
}

(async function () {
	"use strict";

	// Check for category
	if (!document.querySelector("h3#viermatExists")) {
		// Create custom menu category
		const titleOld = document.querySelector("h3");
		const title = titleOld.cloneNode(true);

		title.textContent = "viermat";
		title.id = "viermatExists";

		titleOld.parentElement.append(
			document.querySelectorAll("hr")[2].cloneNode(),
			title,
		);
	}

	// Load tools
	try {
		[pilgrim, warden, envoy, knight, sentinel, energyMax].forEach((f) =>
			f.call(),
		);
	} catch (e) {
		t_displayToast("Error loading Knave tools", "error", 1e10);
		console.error(e);
	}
})();
