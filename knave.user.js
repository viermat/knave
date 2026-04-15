// ==UserScript==
// @name         Knave
// @version      v3
// @description  SimpleMMO toolkit
// @author       viermat (https://github.com/viermat)
// @match        https://web.simple-mmo.com/*
// @icon         https://web.simple-mmo.com/favicon-32x32.png
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// ==/UserScript==

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
 * Work inside an iframe
 * @param {String} url The iframe url
 * @param {callback} callback The callback function that executes inside iframe
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

// Safeguard for _displayToast
while (!unsafeWindow.game_data?.settings)
	await new Promise((r) => setTimeout(r, 100));

/**
 * Custom displayToast for toasts with icons
 * @param {String} src Source of toast icon
 * @param {Number} size Width x Height of icon
 * @param {String} text Toast text
 * @param {String} type Toast type (info, success, error, null)
 * @param {Number} timeout Toast timeout
 * @param {boolean} [bottom=false] Turn gravity to bottom
 */
async function _displayToast(src, size, text, type, timeout, bottom = false) {
	if (bottom) unsafeWindow.game_data.settings.toast_position = "bottom_left";

	displayToast(
		`<img width="${size}" height="${size}" src=${src} /> ${text}`,
		null,
		type,
		timeout,
	);

	if (bottom) unsafeWindow.game_data.settings.toast_position = null;
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
 * Sleep function
 * @param {Number} ms Sleep time in milliseconds
 * @returns
 */
async function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search for an element with a condition
 * @param {Function} handler Handler function (argument: element)
 * @param {String} element Element type
 * @param {Document} doc Document scope
 */
function condSearch(handler, element = "*", doc = document) {
	return Array.from(doc.querySelectorAll(element)).find(handler);
}

function textSearch(string, element = "*", doc = document) {
	return condSearch((e) => e.textContent.includes(string), element, doc);
}

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

		// MutObs for other things
		new MutationObserver(async (mList) => {
			for (const m of mList) {
				if (m.type === "childList" && window.isOn) {
					// Wave to every player that pops up
					textSearch("Wave", "span")?.click();

					// CAPTCHA
					if (textSearch("I'm a person! Promise!", "a")) {
						// Kill stepper
						window.isOn = false;
						alert("Human confirmation needed");
						changeState(btn, true);
						return;
					}

					let npc = null;

					for (const node of m.addedNodes) {
						if (!(node instanceof HTMLElement)) continue;

						const waveEl =
							node.matches("span") &&
							node.textContent.includes("Wave")
								? node
								: node.querySelector?.("span");

						if (waveEl && waveEl.textContent.includes("Wave"))
							waveEl.click();

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
							alert("Human confirmation needed");
							changeState(btn, true);
							return;
						}

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

					if (npc && !npc?.disabled) {
						window.attacking = true;

						await subDoc(
							npc.href.split("?")[0],
							async (doc, win) => {
								let killed = false;

								const oldFetch = win.fetch;

								win.fetch = async (...args) => {
									const res = await oldFetch.apply(win, args);

									try {
										if (
											args[0].startsWith("https://") &&
											new URL(args[0]).href.startsWith(
												"https://web.simple-mmo.com/api/npcs/attack/",
											)
										) {
											const data = await res
												.clone()
												.json();

											if (data.title.includes("Winner")) {
												killed = true;
											} else {
												console.log(data);
												killed = true;
											}
										}
									} catch (e) {
										console.log(e);
									}

									return res;
								};

								while (!killed) {
									const attackBtn = condSearch(
										(e) => e.textContent.trim() == "Attack",
										"button",
										doc,
									);

									if (!attackBtn) break;
									attackBtn.click();

									await wait(
										500 + Math.floor(Math.random() * 500),
									);
								}

								_displayToast(
									doc.querySelector("img#npc_avatar").src,
									20,
									`Killed ${condSearch((e) => /\/npcs\/view/g.test(e.href), "a", doc).textContent}`,
									"success",
									1700,
									true,
								);
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

		async function travel() {
			if (!stepBtn.disabled && window.isOn && !window.attacking) {
				await wait(400 + Math.floor(Math.random() * 500));

				window.fakeX = 800 + Math.floor(Math.random() * 90);
				window.fakeY = 880 + Math.floor(Math.random() * 30);

				stepBtn.click();
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
		btn.addEventListener("click", () => {
			window.isOn = !window.isOn;

			if (window.isOn) {
				changeState(btn);
				travel();
			} else changeState(btn, true);
		});

		// Modify request before it's sent so mouse position corresponds
		const oldFetch = unsafeWindow.fetch;

		unsafeWindow.fetch = async (...args) => {
			if (
				args[0].startsWith("https://") &&
				new URL(args[0]).href.startsWith(
					"https://api.simple-mmo.com/api/action/travel/4",
				)
			) {
				var params = args[1].body;

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

		_displayToast(
			meData.avatar,
			30,
			`You: ${meStr} / ${meDef}`,
			"success",
			5000,
		);
		_displayToast(
			oppData.avatar,
			30,
			`Opponent: ${oppStr} / ${oppDef}`,
			"error",
			5000,
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
	if (!GM_getValue("timeout")) GM_setValue("timeout", 5);
	if (!GM_getValue("interval")) GM_setValue("interval", 2);

	GM_registerMenuCommand(
		"Set when upcoming world boss notification start",
		function () {
			let value = prompt(
				"Set how soon the notifications should start (in minutes)",
				5,
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
				_displayToast(
					b.avatar,
					30,
					`${b.name} (${b.level}) at ${b.date
						.getHours()
						.toString()
						.padStart(2, "0")}:${b.date
						.getMinutes()
						.toString()
						.padStart(2, "0")}`,
					"info",
					toastTimeout * 1000,
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

		const data = await getPlayerData();
		var energyPoints = data.energy;

		if (energyPoints > 0) {
			displayToast(
				'<img width="20" height="20" src="/img/sprites/bosses/16.png" />',
				null,
				"success",
				2000,
			);

			const targetUsers = [];

			await subDoc("/battle/colosseum", (doc) => {
				[...doc.querySelector("tbody").children].forEach((e) => {
					targetUsers.push({
						id: Number(
							/[0-9]+/g.exec(textSearch("Attack", "a", e))[0],
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
				});
			}).then(() => {
				targetUsers.sort((a, b) => {
					return a.level - b.level;
				});
			});

			let breakLoop = 0;

			if (targetUsers.length > 0)
				for (let i = 0; i <= energyPoints - 1; i++) {
					if (breakLoop) break;

					await subDoc(
						"/user/attack/" + targetUsers[i].id,
						async (doc) => {
							while (!doc.querySelector("h2#swal2-title")) {
								doc.querySelector(
									"button#attackButton",
								).click();

								await wait(
									1200 + Math.floor(Math.random() * 800),
								);
							}

							let swalTitle =
								doc.querySelector("h2#swal2-title").textContent;

							if (swalTitle.includes("Winner"))
								_displayToast(
									doc.querySelectorAll("div#npcImg > img")[1]
										?.src,
									20,
									`Killed ${doc.querySelectorAll("a.truncate")[0]?.textContent}`,
									"success",
									5 * 1000,
									1,
								);
							else if (swalTitle.includes("Human")) {
								breakLoop = 1;
								alert("Human verification needed for Knight");
							} else if (swalTitle.includes("Oh no")) {
								breakLoop = 1;
								alert("You have died");
							}
						},
					);

					await wait(1500 + Math.floor(Math.random() * 500));
				}
		} else {
			displayToast(
				"You don't have enough energy to use Knight",
				null,
				"error",
				2500,
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

		await subDoc("/quests", async (doc) => {
			async function asyncQuery(query) {
				return new Promise((resolve) => {
					const interval = setInterval(() => {
						const e = doc.querySelector(query);

						if (e) {
							clearInterval(interval);
							clearTimeout(timer);
							resolve(e);
						}
					}, 100);

					const timer = setTimeout(
						() => clearInterval(interval),
						5000,
					);
				});
			}

			const data = await getPlayerData();
			var questPoints = data.quest_points;

			if (questPoints > 0) {
				displayToast(
					'<img width="20" height="20" src="/img/icons/W_Book01.png" />',
					null,
					"success",
					2000,
				);

				let latestQuest = await asyncQuery(
					".relative.mt-4 > div > button",
				);

				latestQuest.click();

				for (let i = 1; i <= questPoints; i++) {
					let performQuest = await asyncQuery(
						".relative.mt-2 > button",
					);
					performQuest.click();

					await wait(1400 + Math.floor(Math.random() * 500));
				}

				let img = await asyncQuery("img.h-10.w-auto");
				let title = await asyncQuery("div.text-gray-800");

				_displayToast(
					img.src,
					20,
					`Perfomed ${questPoints} of ${title.textContent}`,
					"success",
					5 * 1000,
				);
			} else {
				displayToast(
					"You don't have enough energy to use Sentinel",
					null,
					"error",
					2500,
				);
			}
		});

		btn.classList.remove("disabled");
		changeState(btn, true);
	});
}

async function energyMax() {
	if (/\/inventory\/use\/(?:163049|611)/g.test(location.href)) {
		const useBtn = document.querySelector('button[type="submit"]');
		const maxBtn = useBtn.cloneNode(true);
		const btnParent = useBtn.parentElement;
		const btnInput = btnParent.querySelector("input");

		maxBtn.classList.remove("rounded-r-md");
		maxBtn.classList.add("rounded-l-md");
		maxBtn.textContent = "Use Max";
		maxBtn.setAttribute("type", "button");

		btnInput.classList.remove("rounded-l-md");
		btnParent.prepend(maxBtn);

		maxBtn.addEventListener("click", async (e) => {
			const data = await getPlayerData();
			const itemCount = Number(
				/[0-9]+/g.exec(
					textSearch("of this item", "div.text-sm").textContent,
				)[0],
			);

			const neededEnergy = data.max_energy - data.energy;

			if (neededEnergy == 0) {
				_displayToast(
					"/img/icons/S_Thunder01.png",
					20,
					"You already have max energy!",
					"error",
					1700,
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

	// Ensure script doesn't run in iframes
	if (window.top !== window.self) return;

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

	// Run modules
	[pilgrim, warden, envoy, knight, sentinel, energyMax].forEach((f) =>
		f.call(),
	);
})();
