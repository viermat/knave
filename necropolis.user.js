// ==UserScript==
// @name         Necropolis
// @version      v1
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
 * Change action button color
 * @param {Element} button Action button
 * @param {Element} button Action button span
 * @param {String} [color="crimson"] color Button color
 */
function changeColor(button, buttonSpan, color = "crimson") {
	buttonSpan.style.color = color;
	button.querySelector("svg").setAttribute("fill", color);
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
			await callback(tempFrame.contentDocument);

			tempFrame.remove();

			resolve();
		});
	});
}

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
 * Sleep function
 * @param {Number} ms Sleep time in milliseconds
 * @returns
 */
async function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cemeteryWalk() {
	if (/travel*/g.test(location.href)) {
		// Create action button
		const btnOld = Array.from(document.querySelectorAll("span")).find(
			(span) => span.textContent.includes("Inventory"),
		);

		const btn = btnOld.parentElement.cloneNode(true);
		btnOld.parentElement.parentElement.appendChild(btn);

		// Action button's text element
		const btnSpan = btn.querySelector("span");

		// Check for SMMO's "captcha"
		new MutationObserver((mList) => {
			for (const m of mList) {
				if (m.type === "childList") {
					if (
						Array.from(document.querySelectorAll("*")).find((btn) =>
							btn.textContent.includes("I'm a person! Promise!"),
						)
					) {
						// Kill stepper
						window.isOn = false;
						alert("Human confirmation needed");
						changeColor(btn, btnSpan);
					}
				}
			}
		}).observe(document.querySelector('div[class="px-4 py-3"]'), {
			childList: true,
			subtree: true,
		});

		/**
		 * Stepper interval checker
		 * @param {Number} t Interval timeout for stepping
		 */
		function autoStep(t) {
			window.goodbye = setInterval(
				() => {
					if (window.isOn) {
						window.fakeX = 800 + Math.floor(Math.random() * 90);
						window.fakeY = 880 + Math.floor(Math.random() * 30);

						let result = Array.from(
							document.querySelectorAll("span"),
						).find((span) =>
							span.textContent.includes("Take a Step"),
						);

						if (result) result = result.parentElement;
						if (!result.disabled) result.click();

						autoStep(t);
					}

					clearInterval(window.goodbye);
				},
				t + Math.floor(Math.random() * 500),
			);
		}

		// Stylize action button
		btnSpan.textContent = "Cemetery Walk";
		btn.style.cursor = "pointer";

		// Set default color
		changeColor(btn, btnSpan);

		// Repurpose "a" element into a button
		btn.removeAttribute("href");
		btn.addEventListener("click", () => {
			window.isOn = !window.isOn;

			if (window.isOn) changeColor(btn, btnSpan, "lime");
			else changeColor(btn, btnSpan);

			autoStep(1200);
		});

		// Monkey-patching fetch
		// This is the most important part of the user script, as this makes the step request seem legit by faking cursor position and denying event dispatching.
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

async function graveDigger() {
	// Check for API key
	if (!GM_getValue("api_key")) {
		await subDoc("https://web.simple-mmo.com/p-api/home", (doc) => {
			GM_setValue(
				"api_key",
				doc.querySelector("input[name='api_key']").value,
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
		!GM_getValue("graveDigger_cache") ||
		GM_getValue("graveDigger_cache").stats.error
	) {
		await postReq("player/me").then((s) => {
			GM_setValue("graveDigger_cache", {
				lastCache: new Date().getTime(),
				stats: s,
			});
		});
	}

	// URL Path array
	var argArr = location.href.split("/");

	// Check if user is attacking another use
	if (/\/user\/attack\/[0-9]+/g.test(location.href)) {
		if (GM_getValue("graveDigger_cache")) {
			let diff =
				new Date(GM_getValue("graveDigger_cache").lastCache) -
				new Date();

			if (diff <= -2 * 60 * 1000) {
				await postReq("player/me").then((s) => {
					GM_setValue("graveDigger_cache", {
						lastCache: new Date().getTime(),
						stats: s,
					});
				});
			}
		}

		// Calculate user's and opponents' strength and defence
		const meData = GM_getValue("graveDigger_cache").stats;
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

async function graveyardShift() {
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
					level: earliestBoss
						.querySelector(".text-gray-500")
						.textContent.trim(),
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
						avatar: mainDiv.parentElement.querySelector("img").src,
						date: parseTime(e.textContent.trim()),
					});
				});

				resolve(bossArr);
			});
		});
	}

	// Cache system
	if (!GM_getValue("graveyardShift_cache")) {
		await cacheBosses().then((b) => {
			GM_setValue("graveyardShift_cache", {
				lastCache: new Date().getTime(),
				bosses: b,
			});
		});
	} else {
		let diff =
			new Date(GM_getValue("graveyardShift_cache").lastCache) -
			new Date();

		if (diff <= -30 * 60 * 1000) {
			cacheBosses().then((b) => {
				GM_setValue("graveyardShift_cache", {
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

	const BOSSES = GM_getValue("graveyardShift_cache").bosses;

	// First page load check
	handleNotify(BOSSES, GM_getValue("timeout"));

	// Regular check
	setInterval(
		() => handleNotify(BOSSES, GM_getValue("timeout")),
		GM_getValue("interval") * 60 * 1000,
	);
}

async function grimReaper() {
	// Create action button
	const btnOld = Array.from(document.querySelectorAll("span")).find((span) =>
		span.textContent.includes("Battle"),
	);

	const btn = btnOld.parentElement.cloneNode(true);
	btnOld.parentElement.parentElement.appendChild(btn);

	// Action button's text element
	const btnSpan = btn.querySelector("span");

	// Stylize action button
	btnSpan.textContent = "Grim Reaper";
	btn.style.cursor = "pointer";

	changeColor(btn, btnSpan, "lime");

	// Repurpose "a" element into a button
	btn.removeAttribute("href");
	btn.addEventListener("click", async (e) => {
		if (btn.classList.contains("disabled")) {
			e.preventDefault();
			return;
		}

		btn.classList.add("disabled");
		changeColor(btn, btnSpan);

		var energyPoints;

		await subDoc("/user/character", (doc) => {
			energyPoints = Number(
				[...doc.querySelectorAll("dt")]
					.find((e) => e.textContent.trim() === "Energy")
					.parentElement.querySelector(".text-gray-300.font-medium")
					.parentElement.textContent.trim()
					.split(" ")[0],
			);
		});

		if (energyPoints > 0) {
			displayToast(
				'<img width="20" height="20" src="/img/sprites/bosses/16.png" />',
				null,
				"success",
				2000,
			);

			const targetUsers = [];

			await subDoc("/battle/colosseum", (doc) => {
				doc.querySelectorAll(".font-normal.text-gray-600").forEach(
					(e) => {
						targetUsers.push({
							id: Number(
								/[0-9]+/g.exec(
									e.parentElement.parentElement.querySelectorAll(
										"a",
									)[2].href,
								)[0],
							),
							level: Number(
								/Level ([0-9]+)/g.exec(
									e.textContent.replaceAll(",", ""),
								)[1],
							),
						});
					},
				);
			}).then(() => {
				targetUsers.sort((a, b) => {
					return a.level - b.level;
				});
			});

			if (targetUsers.length > 0)
				for (let i = 0; i <= energyPoints - 1; i++) {
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

							_displayToast(
								doc.querySelectorAll("div#npcImg > img")[1]
									?.src,
								20,
								`Killed ${doc.querySelectorAll("a.truncate")[0]?.textContent}`,
								"success",
								5 * 1000,
								1,
							);
						},
					);

					await wait(1500 + Math.floor(Math.random() * 500));
				}
		} else {
			displayToast(
				"You don't have enough energy to use Grim Reaper",
				null,
				"error",
				2500,
			);
		}

		btn.classList.remove("disabled");
		changeColor(btn, btnSpan, "lime");
	});
}

async function nightWorker() {
	// Create action button
	const btnOld = Array.from(document.querySelectorAll("span")).find((span) =>
		span.textContent.includes("Battle"),
	);

	const btn = btnOld.parentElement.cloneNode(true);
	btnOld.parentElement.parentElement.appendChild(btn);

	// Action button's text element
	const btnSpan = btn.querySelector("span");

	// Stylize action button
	btnSpan.textContent = "Night Worker";
	btn.style.cursor = "pointer";

	changeColor(btn, btnSpan, "lime");

	// Repurpose "a" element into a button
	btn.removeAttribute("href");
	btn.addEventListener("click", async (e) => {
		if (btn.classList.contains("disabled")) {
			e.preventDefault();
			return;
		}

		btn.classList.add("disabled");
		changeColor(btn, btnSpan);

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

			var questPoints = Number(
				doc.querySelector('[x-text="number_format(quest_points)"]')
					.textContent,
			);

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
					"You don't have enough energy to use Night Worker",
					null,
					"error",
					2500,
				);
			}
		});

		btn.classList.remove("disabled");
		changeColor(btn, btnSpan, "lime");
	});
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
	[
		cemeteryWalk,
		graveDigger,
		graveyardShift,
		grimReaper,
		nightWorker,
	].forEach((f) => f.call());
})();
