// ==UserScript==
// @name         Knave
// @version      4.2
// @description  SimpleMMO toolkit
// @author       viermat (https://github.com/viermat)
// @match        https://web.simple-mmo.com/*
// @icon         https://web.simple-mmo.com/favicon-32x32.png
// @run-at       document-end
// @grant 		 GM_addValueChangeListener
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

// Simpler name
this.getSTG = GM_getValue;
this.setSTG = GM_setValue;

const ICONS = {
	Attack: "/img/icons/W_Axe008.png",
	Boss: "/img/sprites/bosses/16.png",
	Energy: "/img/icons/S_Thunder01.png",
	Book: "/img/icons/W_Book01.png",

	Wave: "/img/icons/one/icon088.png",
	NPC: "/img/icons/S_Earth03.png",
	Step: "/img/icons/A_Shoes01.png",
	Clock: "/img/icons/I_Clock.png",
};

const CompletedEvent = new CustomEvent("completed");

async function codex(settings) {
	if (/\/preferences\/customisation*/g.test(location.href)) {
		const textIcon = document
			.querySelectorAll(".px-2.text-yellow-800")[1]
			.cloneNode(true);

		textIcon.classList.remove("text-yellow-800");
		textIcon.classList.remove("bg-yellow-100");

		textIcon.classList.add("text-purple-800");
		textIcon.classList.add("bg-purple-100");

		textIcon.textContent = "Knave";

		function createSwitch(title, desc, gmValue) {
			var switchState = false;

			const _switchEl = textSearch(
				"Task Autocomplete",
				"span",
			).parentElement;

			const switchEl = _switchEl.cloneNode(true);
			switchEl.setAttribute("wire:ignore", "");

			const switchTitle = switchEl.querySelector(
				"#availability-label-task_autocomplete",
			);

			switchTitle.parentElement.appendChild(textIcon.cloneNode(true));

			switchTitle.setAttribute("id", `${gmValue}-title`);
			switchTitle.textContent = title;

			const switchDesc = switchEl.querySelector(
				"#availability-description-task_autocomplete",
			);

			switchDesc.setAttribute("id", `${gmValue}-desc`);
			switchDesc.textContent = desc;

			const switchBtn = switchEl.querySelector("button");

			switchBtn.removeAttribute("wire:click");

			function check(enabled) {
				switchState = enabled;

				if (enabled) {
					switchBtn.classList.remove("bg-gray-200");
					switchBtn.classList.add("bg-indigo-600");

					switchBtn
						.querySelector("span")
						.classList.remove("translate-x-0");
					switchBtn
						.querySelector("span")
						.classList.add("translate-x-5");
				} else {
					switchBtn.classList.add("bg-gray-200");
					switchBtn.classList.remove("bg-indigo-600");

					switchBtn
						.querySelector("span")
						.classList.add("translate-x-0");
					switchBtn
						.querySelector("span")
						.classList.remove("translate-x-5");
				}
			}

			check(Boolean(getSTG(gmValue)));

			switchBtn.addEventListener("click", () => {
				switchState = !switchState;

				setSTG(gmValue, switchState);
				check(switchState);
			});

			_switchEl.parentElement.appendChild(switchEl);

			switchEl.classList.add("knave-stg");
			return switchEl;
		}

		function createInput(
			title,
			desc,
			gmValue,
			inputType = "text",
			defaultVal,
		) {
			const _inputEl = textSearch(
				"Reset the Tutorial",
				"span",
			).parentElement;

			const inputEl = _inputEl.cloneNode(true);
			inputEl.setAttribute("wire:ignore", "");

			const inputTitle = inputEl.querySelector(
				"#availability-label-tutorial-reset",
			);

			inputTitle.parentElement.appendChild(textIcon.cloneNode(true));

			inputTitle.setAttribute("id", `${gmValue}-title`);
			inputTitle.textContent = title;

			const inputDesc = inputEl.querySelector(
				"#availability-description-tutorial-reset",
			);

			inputDesc.setAttribute("id", `${gmValue}-desc`);
			inputDesc.textContent = desc;

			const inputBtn = inputEl.querySelector("button");
			inputBtn.textContent = "Change";

			inputBtn.removeAttribute("wire:click");

			inputBtn.addEventListener("click", () => {
				Swal.fire({
					title: title,
					type: "info",
					input: inputType,
					inputPlaceholder: getSTG(gmValue),
					preConfirm: (input) => {
						if (!input) input = defaultVal;

						if (inputType == "number") input = Number(input);

						setSTG(gmValue, input);
					},
				});
			});

			_inputEl.parentElement.appendChild(inputEl);

			inputEl.classList.add("knave-stg");
			return inputEl;
		}

		function injectSettings() {
			document.querySelectorAll(".knave-stg").forEach((e) => e.remove());

			settings.forEach((s) => {
				const commonArgs = [s.title, s.description, s.gmValue];

				if (s.depends) {
					if (!getSTG(s.depends)) return;

					commonArgs[0] = `-> ${s.title}`;
				}

				if (s.type == "falsy") createSwitch(...commonArgs);
				else {
					createInput(...commonArgs, s.type, s.default);
				}
			});
		}

		settings.forEach((s) => {
			if (!s.depends) {
				GM_addValueChangeListener(s.gmValue, () => {
					injectSettings();
				});
			}
		});

		injectSettings();
		unsafeWindow.Livewire.hook("morphed", injectSettings);
	}
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

		const stats = {
			time: 0,
			steps: 0,
			kills: 0,
			waves: 0,
		};

		async function autoHandler() {
			const data = await getPlayerData();

			const half = getSTG("pilgrimAutoH");

			if (getSTG("pilgrimAutoK") && !window.isSentinelOn) {
				if (
					data.energy >=
					(half ? Math.floor(data.max_energy / 2) : data.max_energy)
				) {
					window.isPilgrimOn = false;

					document.querySelector("#knaveKnight").click();

					window.addEventListener(
						"completed",
						() => {
							if (!window.isPilgrimOn) {
								window.isPilgrimOn = true;
								travel();
							}
						},
						{ once: true },
					);
				}
			}

			if (getSTG("pilgrimAutoS") && !window.isKnightOn) {
				if (
					data.quest_points >=
					(half
						? Math.floor(data.max_quest_points / 2)
						: data.max_quest_points)
				) {
					window.isPilgrimOn = false;

					document.querySelector("#knaveSentinel").click();

					window.addEventListener(
						"completed",
						() => {
							if (!window.isPilgrimOn) {
								window.isPilgrimOn = true;
								travel();
							}
						},
						{ once: true },
					);
				}
			}
		}

		function switchState() {
			window.isPilgrimOn = !window.isPilgrimOn;

			if (window.isPilgrimOn) {
				if (stats.time == 0) stats.time = new Date();

				changeState(btn);
				travel();

				if (getSTG("pilgrimExpire"))
					window.pilgrimExpire = setTimeout(
						() => {
							if (window.isPilgrimOn) switchState();
						},
						getSTG("pilgrimExpireT") * 60 * 1000,
					);

				if (getSTG("pilgrimAuto")) {
					autoHandler();

					window.pilgrimAuto = setInterval(
						() => autoHandler(),
						2 * 1000 * 60,
					);
				}
			} else {
				clearInterval(window.pilgrimAuto);

				changeState(btn, true);

				if (stats.steps > 5 && getSTG("pilgrimAlert")) {
					let totalSeconds = Math.floor(
						(Date.now() - stats.time) / 1000,
					);

					const rows = [
						["Steps", stats.steps, ICONS.Step],
						["NPCs killed", stats.kills, ICONS.NPC],
						[
							"Time",
							`${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`,
							ICONS.Clock,
						],
					];

					if (getSTG("pilgrimWave"))
						rows.push(["Waves", stats.waves, ICONS.Wave]);

					Swal.fire({
						title: "Journey completed",
						type: "success",
						html: `
							<div class="stats-grid" style="
								display: grid;
								grid-template-columns: auto auto;
								gap: 0.5em 1em;
								text-align: left;
								margin: 0 auto;
								max-width: 15em;
							">
								${rows
									.map(
										([label, value, icon]) => `
											<span><img width="30" height="30" src=${icon} /> <b>${label}</b></span>
											<span class="value">${value}</span>
										`,
									)
									.join("")}
							</div>
						`,
						timer: getSTG("pilgrimAlertT") ? 30 * 1000 : 0,
					});
				}

				stats.time = 0;
				stats.steps = 0;
				stats.kills = 0;
				stats.waves = 0;

				if (getSTG("pilgrimExpire")) clearTimeout(window.pilgrimExpire);
			}
		}

		// MutObs for other things
		new MutationObserver(async (mList) => {
			for (const m of mList) {
				if (m.type === "childList" && window.isPilgrimOn) {
					let npc = null;

					// Check only for added nodes
					for (const node of m.addedNodes) {
						if (!(node instanceof HTMLElement)) continue;

						// Kill if dead
						const healEl =
							node.matches("a") &&
							node.textContent.includes("heal?")
								? node
								: node.querySelector?.("a");

						if (healEl && healEl.textContent.includes("heal?")) {
							window.isPilgrimOn = false;
							changeState(btn, true);

							Swal.fire({
								title: "Warning",
								type: "warning",

								text: "Pilgrim has stopped. Heal and turn on again to continue",
							});

							return;
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
							window.isPilgrimOn = false;
							changeState(btn, true);

							Swal.fire({
								title: "Warning",
								type: "warning",

								text: "Pilgrim has stopped. Complete human verification and turn on again to continue",
							});

							return;
						}

						// Auto wave
						const waveEl =
							node.matches("span") &&
							node.textContent.includes("Wave")
								? node
								: node.querySelector?.("span");

						if (
							waveEl &&
							waveEl.textContent.includes("Wave") &&
							getSTG("pilgrimWave")
						) {
							waveEl.click();
							waveEl.parentElement.remove();

							stats.waves++;
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

													stats.kills++;
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
													} else if (
														data.title.includes(
															"Hold up!",
														)
													) {
														t_displayToast(
															`You are dead`,
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
			if (!stepBtn.disabled && window.isPilgrimOn && !window.attacking) {
				await asyncWait(400 + Math.floor(Math.random() * 500));

				window.fakeX = 800 + Math.floor(Math.random() * 90);
				window.fakeY = 880 + Math.floor(Math.random() * 30);

				stepBtn.click();

				stats.steps++;
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
	if (!getSTG("api_key")) {
		await subDoc("https://web.simple-mmo.com/p-api/home", (doc) => {
			setSTG(
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
				api_key: getSTG("api_key"),
			}),
		}).then((r) => {
			return r.json();
		});
	};

	// Cache system
	if (!getSTG("warden_cache") || getSTG("warden_cache").stats.error) {
		await postReq("player/me").then((s) => {
			setSTG("warden_cache", {
				lastCache: new Date().getTime(),
				stats: s,
			});
		});
	}

	// URL Path array
	var argArr = location.href.split("/");

	// Check if user is attacking another user
	if (/\/user\/attack\/[0-9]+/g.test(location.href)) {
		if (getSTG("warden_cache")) {
			let diff = new Date(getSTG("warden_cache").lastCache) - new Date();

			if (diff <= -2 * 60 * 1000) {
				await postReq("player/me").then((s) => {
					setSTG("warden_cache", {
						lastCache: new Date().getTime(),
						stats: s,
					});
				});
			}
		}

		// Calculate user's and opponents' strength and defence
		const meData = getSTG("warden_cache").stats;
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

				if (earliestBoss == null) resolve(bossArr);
				else {
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
							).src,
							date: parseTime(e.textContent.trim()),
						});
					});
				}

				resolve(bossArr);
			});
		});
	}

	// Cache system
	if (!getSTG("boss_cache")) {
		await cacheBosses().then((b) => {
			setSTG("boss_cache", {
				lastCache: new Date().getTime(),
				bosses: b,
			});
		});
	} else {
		let diff = new Date(getSTG("boss_cache").lastCache) - new Date();

		if (diff <= -30 * 60 * 1000) {
			cacheBosses().then((b) => {
				setSTG("boss_cache", {
					lastCache: new Date().getTime(),
					bosses: b,
				});
			});
		}
	}

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

	const BOSSES = getSTG("boss_cache").bosses;

	// First page load check
	handleNotify(BOSSES, getSTG("envoyTimeout"));

	// Regular check
	setInterval(
		() => handleNotify(BOSSES, getSTG("envoyTimeout")),
		getSTG("envoyInterval") * 60 * 1000,
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

	btn.setAttribute("id", "knaveKnight");

	// Repurpose "a" element into a button
	btn.removeAttribute("href");
	btn.addEventListener("click", async (e) => {
		if (window.isPilgrimOn) {
			t_displayToast(
				"Can't use Knight while Pilgrim is running",
				"error",
				5,
			);
			return;
		}

		if (window.isSentinelOn) {
			t_displayToast(
				"Can't use Knight while Sentinel is running",
				"error",
				5,
			);
			return;
		}

		if (window.isKnightOn) {
			window.isKnightOn = false;
		} else {
			function killKnight() {
				window.isKnightOn = false;

				window.dispatchEvent(CompletedEvent);
			}

			changeState(btn);

			// Get EP count
			const data = await getPlayerData();

			var energyPoints = data.energy;

			if (data.current_hp > 0)
				if (energyPoints > 0) {
					window.isKnightOn = true;

					i_displayToast(ICONS.Boss, "Knight started", "success", 2);

					async function generatePlayers(energy) {
						var users = [];

						// Run inside /battle so the request looks like it came from the actual page
						await subDoc("/battle", async (doc, win) => {
							while (
								!win.game_data?.battle?.colosseum
									?.generate_opponents_endpoint
							)
								await new Promise((r) => setTimeout(r, 100));

							for (let i = 0; i < Math.ceil(energy / 10); i++) {
								await win.game.fetch({
									endpoint:
										win.game_data.battle.colosseum
											.generate_opponents_endpoint,

									body: {
										min_level: null,
										max_level: getSTG("knightLvl"),
										min_gold: null,
										only_in_guild_war: getSTG("knightWar"),
										has_bounty: false,
									},

									on_success: function (e) {
										users = Array.from(
											new Map(
												[
													...users,
													...e["opponents"],
												].map((opp) => [opp.id, opp]),
											).values(),
										);
									},
								});

								await asyncWait(600);
							}
						});

						users.sort((a, b) => {
							return a.level - b.level;
						});

						users.splice(energy);

						return users;
					}

					var targetUsers = [];

					try {
						targetUsers = await generatePlayers(energyPoints);
					} catch {}

					var killCount = 0;

					if (targetUsers.length > 0) {
						for (let i = 0; i < targetUsers.length; i++) {
							if (!window.isKnightOn) break;

							const currentUser = targetUsers[i];

							var tempEl = document.createElement(null);
							tempEl.innerHTML = currentUser.name;

							const userName =
								tempEl.querySelector("a > span > span")
									.textContent || "Opponent";

							await subDoc(
								"/user/attack/" + currentUser.id,
								async (doc, win) => {
									let oppDefeated = false;

									// Patch XHR (no idea why attack doesn't use fetch)
									const oldSend =
										win.XMLHttpRequest.prototype.send;

									win.XMLHttpRequest.prototype.send =
										function (body) {
											this.addEventListener(
												"load",
												async function () {
													let res =
														this?.responseText;

													try {
														res = JSON.parse(
															this.responseText,
														);

														let type = res?.type;

														if (type) {
															oppDefeated = true;

															if (
																type ==
																	"success" ||
																type == null
															) {
																killCount++;

																i_displayToast(
																	currentUser?.avatar_url,
																	`Killed ${userName}`,
																	"success",
																	5,
																	true,
																);
															} else if (
																type === "error"
															) {
																if (
																	res.result.includes(
																		"defeated",
																	)
																) {
																	killKnight();

																	i_displayToast(
																		currentUser?.avatar_url,
																		`Died attacking ${userName}`,
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
																		currentUser?.avatar_url,
																		`Could not attack ${userName}, skipping`,
																		"info",
																		5,
																		true,
																	);

																	targetUsers.push(
																		...(await generatePlayers(
																			1,
																		)),
																	);
																} else {
																	killKnight();

																	t_displayToast(
																		`Error attacking: ${data.title}`,
																		"error",
																		10,
																	);

																	console.error(
																		res,
																	);
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
											1.1 +
												Math.floor(Math.random() * 0.8),
										);
									}
								},
							);

							await asyncWait(
								1500 + Math.floor(Math.random() * 500),
							);
						}

						i_displayToast(
							ICONS.Attack,
							`Killed ${killCount} players`,
							"success",
							5,
						);
					} else {
						t_displayToast("No opponents found", "error", 2.5);
					}
				} else {
					t_displayToast(
						"You don't have enough energy to use Knight",
						"error",
						2.5,
					);
				}
			else
				t_displayToast(
					"You don't have enough health to use Knight",
					"error",
					2.5,
				);

			changeState(btn, true);
		}
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

	btn.setAttribute("id", "knaveSentinel");

	// Repurpose "a" element into a button
	btn.removeAttribute("href");
	btn.addEventListener("click", async (e) => {
		if (window.isPilgrimOn) {
			t_displayToast(
				"Can't use Sentinel while Pilgrim is running",
				"error",
				5,
			);
			return;
		}

		if (window.isKnightOn) {
			t_displayToast(
				"Can't use Sentinel while Knight is running",
				"error",
				5,
			);
			return;
		}

		if (window.isSentinelOn) {
			window.isSentinelOn = false;
		} else {
			function killSentinel() {
				window.isSentinelOn = false;

				window.dispatchEvent(CompletedEvent);
			}

			changeState(btn);

			// Enter quests
			await subDoc("/quests", async (doc) => {
				// Collect QP count
				const data = await getPlayerData();
				var questPoints = data.quest_points;

				if (questPoints > 0) {
					window.isSentinelOn = true;

					var questCount = 0;

					i_displayToast(
						ICONS.Book,
						"Sentinel started",
						"success",
						2,
					);

					// Elements can only be queried through classes unfortunately, no IDs or accessible text

					// Get latest quest
					let latestQuest = await asyncQuery(
						".relative.mt-4 > div > button",
						doc,
					);

					latestQuest.click();

					// Quest solver
					for (let i = 1; i <= questPoints; i++) {
						if (!window.isSentinelOn) break;

						let performQuest = await asyncQuery(
							".relative.mt-2 > button",
							doc,
						);

						performQuest.click();

						questCount++;

						await asyncWait(1400 + Math.floor(Math.random() * 500));
					}

					let img = await asyncQuery("img.h-10.w-auto", doc);
					let title = await asyncQuery("div.text-gray-800", doc);

					i_displayToast(
						img.src,
						`Performed ${questCount} of '${title.textContent}'`,
						"success",
						5,
					);

					killSentinel();
				} else {
					t_displayToast(
						"You don't have enough energy to use Sentinel",
						"error",
						2.5,
					);
				}
			});

			changeState(btn, true);
		}
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

async function statMax() {
	if (/user\/character/g.test(location.href) && getSTG("statMax")) {
		unsafeWindow.upgradeStat = (type) => {
			let add = Number(
				document.querySelector("#available_points").textContent,
			);

			fetch("/api/user/upgrade/" + type, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					_token: token,
					amount: add || 0,
				}),
			})
				.then((r) => r.json())
				.then((res) => {
					if (res?.type == "success") {
						document.getElementById(type + "_stat").innerHTML =
							unsafeWindow.format_number(res.new_stat_amount);
						document.getElementById("available_points").innerHTML =
							unsafeWindow.format_number(res.available_stats) ||
							"0";

						t_displayToast(
							`Added ${add} to ${type.toUpperCase()}`,
							"success",
							2.3,
						);
					}
				});
		};
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

	const SETTINGS = [
		{
			title: "Envoy Earliest Notification",
			description:
				"Set when the earliest world boss notification should appear (in minutes)",
			gmValue: "envoyTimeout",
			type: "number",
			default: 30,
		},
		{
			title: "Envoy Notification Interval",
			description:
				"Set how often a notification should appear for the upcoming world boss (in minutes)",
			gmValue: "envoyInterval",
			type: "number",
			default: 2,
		},
		{
			title: "Knight Max Level",
			description: "Set Knight's max opponent level",
			gmValue: "knightLvl",
			type: "number",
			default: 700,
		},
		{
			title: "Knight Guild War",
			description:
				"Enable/disable Knight attacking exclusively opponents of war",
			gmValue: "knightWar",
			type: "falsy",
			default: false,
		},
		{
			title: "Pilgrim Auto Wave",
			description: "Enable/disable Pilgrim auto-waving to players",
			gmValue: "pilgrimWave",
			type: "falsy",
			default: true,
		},
		{
			title: "Pilgrim Journey Alert",
			description:
				"Enable/disable Pilgrim progress alerts after completing a journey",
			gmValue: "pilgrimAlert",
			type: "falsy",
			default: true,
		},
		{
			title: "Pilgrim Journey Alert Timeout",
			description:
				"Enable/disable Pilgrim progress alerts disappearing after 30 seconds",
			gmValue: "pilgrimAlertT",
			type: "falsy",
			default: true,
			depends: "pilgrimAlert",
		},
		{
			title: "Pilgrim Auto Use",
			description:
				"Enable/disable Pilgrim auto attacking and auto questing",
			gmValue: "pilgrimAuto",
			type: "falsy",
			default: false,
		},
		{
			title: "Pilgrim Auto Knight",
			description: "Enable/disable Pilgrim auto attacking",
			gmValue: "pilgrimAutoK",
			type: "falsy",
			default: true,
			depends: "pilgrimAuto",
		},
		{
			title: "Pilgrim Auto Sentinel",
			description: "Enable/disable Pilgrim auto questing",
			gmValue: "pilgrimAutoS",
			type: "falsy",
			default: true,
			depends: "pilgrimAuto",
		},
		{
			title: "Pilgrim Auto Use at Half",
			description:
				"Enable/disable Pilgrim auto attacking/questing at half energy instead of full",
			gmValue: "pilgrimAutoH",
			type: "falsy",
			default: false,
			depends: "pilgrimAuto",
		},
		{
			title: "Pilgrim Auto Stop",
			description:
				"Enable/disable Pilgrim stopping after specified duration",
			gmValue: "pilgrimExpire",
			type: "falsy",
			default: true,
		},
		{
			title: "Pilgrim Auto Stop Timeout",
			description: "Set Pilgrim autostop timeout (in minutes)",
			gmValue: "pilgrimExpireT",
			type: "number",
			default: 30,
			depends: "pilgrimExpire",
		},
		{
			title: "Stat Max",
			description:
				"Enable/disable automatically using all points when adding to a stat",
			gmValue: "statMax",
			type: "falsy",
			default: false,
		},
	];

	GM_registerMenuCommand("Factory reset settings", () => {
		SETTINGS.forEach((s) => {
			setSTG(s.gmValue, s.default);
		});
	});

	// Simple snippet to skip over stupid errors from keys not existing
	SETTINGS.forEach((s) => {
		let value = getSTG(s.gmValue);
		if (value === undefined || value === null) setSTG(s.gmValue, s.default);
	});

	// Load tools
	try {
		codex(SETTINGS);

		[pilgrim, warden, envoy, knight, sentinel, energyMax, statMax].forEach(
			(f) => f.call(),
		);
	} catch (e) {
		t_displayToast("Error loading Knave tools", "error", 1e10);
		console.error(e);
	}
})();
