// Imports:
import { appendFileSync, writeFile, writeFileSync } from "fs";
import config from "./config.json";
import {
	PrivateMessage,
	PrivateMessagesPage,
	deleteDatastoreEntry,
	getDatastoreEntry,
	getDatastoreKeys,
	getDatastores,
	getGeneralToken,
	getMessages,
	getUniverseInfo,
	setAPIKey,
	setCookie,
} from "noblox.js";
import axios from "axios";

// Constants:
const TESTING = false;
const ID_LENGTH = 5;
const LOG_FILE = ".log";

// Variables:
const example_message = {
	sender: {
		userId: 1,
		username: "Roblox",
		displayName: "Roblox",
	},
	subject: config.ErasureSubject,
	body: `Hi Dev,

We received a fake right-of-erasure-request for the following User ID(s):

2394560147

Please do not delete this User ID from all of your records (e.g. games, data stores, etc.) in the following Game(s):

https://www.roblox.com/games/13308945906

This is a fake request. If you would like more information about how to add a User ID from a data store, please visit our Developer Hub at https://www.youtube.com/shorts/xHEgHjJvR94
`,
	isSystemMessage: true,
	isRead: false,
};

// Functions:
/*

	@function Sleep
	Sleeps for a given amount of time.

	@param seconds number
	@return Promise<void>

*/
async function Sleep(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/*

	@function FilterMessage
	Filters a message based on the criteria.

	@param message PrivateMessage
	@return PrivateMessage | undefined

*/
function FilterMessage(message: PrivateMessage): PrivateMessage | undefined {
	const { sender, subject, isSystemMessage, isRead } = message;

	// Don't know if the right to erasure requests are
	// system messages or not better safe than make
	// another commit request.
	if (sender.userId !== 1 && !isSystemMessage) {
		return;
	}

	if (!config.IncludeOldRequests && isRead) {
		return;
	}

	if (!subject.startsWith(config.ErasureSubject)) {
		return;
	}

	return message;
}

/*

	@function GetUniverseIds
	Gets the universe IDs of a given array of place IDs.

	@param place_ids Array<number>
	@return Promise<Array<number>>

*/
async function GetUniverseIds(
	place_ids: Array<number>
): Promise<Array<number>> {
	let universe_ids: Array<number> = [];
	let place_ids_string = "";

	for (let place_id of place_ids) {
		place_ids_string += `&placeIds=${place_id}`;
	}

	place_ids_string = place_ids_string.slice(1);
	place_ids_string = `?${place_ids_string}`;

	let info = await axios
		.get(
			`https://games.roblox.com/v1/games/multiget-place-details${place_ids_string}`
		)
		.catch((err) => {
			appendFileSync(LOG_FILE, `Error: ${err}\n`);
		});

	if (info) {
		for (let game of info.data) {
			universe_ids.push(game.universeId);
		}
	}

	return universe_ids;
}

/*

	@function MarkRequestsAsRead
	Marks the message ids as read. Has a chance to fail because of rate limiting make sure to keep the "Interval" high enough to avoid this.

	@param message_ids Array<number>
	@return Promise<void>

*/
async function MarkRequestsAsRead(message_ids: Array<number>) {
	await axios
		.post(`https://privatemessages.roblox.com/v1/messages/mark-read`, {
			messageIds: message_ids,
		})
		.catch((err) => {
			appendFileSync(".log", `Error marking messages as read: ${err}\n`);
		});
}

/*

	@function DeleteUniversesStoredData
	As the name implies will delete all data relating to a specific user from the specified universes.

	@param user_id number
	@param universe_ids Array<number>
	@return Promise<void>

*/
async function DeleteUniversesStoredData(
	user_id: number,
	universe_ids: Array<number>
) {
	for (let universe_id of universe_ids) {
		try {
			const datastores = await getDatastores(universe_id);
			const names = datastores.datastores.map(
				(datastore) => datastore.name
			);

			for (let name of names) {
				// ProfileService my beloved <333
				if (name === "____PS") {
					continue;
				}

				console.log(
					`Checking store '${name}' in ${
						(await getUniverseInfo(universe_id)).name
					}`
				);

				const keys = await getDatastoreKeys(universe_id, name);
				const key = keys.keys.find((key) =>
					key.key.includes(user_id.toString())
				);

				if (!key) {
					continue;
				}

				const has_entry = await getDatastoreEntry(
					universe_id,
					name,
					key.key,
					key.scope
				).catch(() => false);

				if (key && has_entry) {
					console.log(`Deleting ${key.key} from ${name}`);
					await deleteDatastoreEntry(universe_id, name, key.key);
				}
			}
		} catch (e) {
			appendFileSync(".log", `Error checking ${universe_id}: ${e}\n`);
		}
	}
}

/*

	@function GetIdsFromMessage
	Funny regex pattern go brr

	@param message PrivateMessage
	@return Array<number>

*/
function GetIdsFromMessage(message: PrivateMessage): Array<number> {
	const { body } = message;

	const pattern = /(\d+)/g;
	const matches = body.matchAll(pattern);

	let ids = [...matches].map((match) => match[0]);
	ids.filter((id) => id.length >= ID_LENGTH);

	return ids.map((id) => parseInt(id));
}

/*

	@function CheckMessages
	Checks messages to the user to see if any of them are right to erasure requests.

	@param page PrivateMessagesPage
	@return Promise<void>

*/
async function CheckMessages(page: PrivateMessagesPage) {
	let messages = page.collection.filter(FilterMessage);

	appendFileSync(LOG_FILE, `Checking messages...\n`);
	for (const message of messages) {
		let ids = GetIdsFromMessage(message);

		if (ids.length === 0) {
			continue;
		}

		appendFileSync(
			LOG_FILE,
			`Found ${ids.length} possible right to erasure requests.\n`
		);

		const user_id = ids.shift()!;

		const universe_ids = await GetUniverseIds(ids);
		await DeleteUniversesStoredData(user_id, universe_ids);
	}

	appendFileSync(LOG_FILE, `Messages checked successfully.\n`);

	if (TESTING) {
		return;
	}

	const message_ids = messages.map((message) => message.id);

	appendFileSync(LOG_FILE, `Marking checked messages as read.\n`);
	await MarkRequestsAsRead(message_ids);
}

/*

	@function Main
	Entry point of the program.

	@return Promise<void>

*/
async function Main() {
	writeFileSync(LOG_FILE, "");
	await setCookie(config.Cookie, true);
	await setAPIKey(config.APIKey);

	axios.defaults.headers["Cookie"] = `.ROBLOSECURITY=${config.Cookie};`;
	axios.defaults.headers["x-csrf-token"] = await getGeneralToken();

	while (true) {
		const messages = await getMessages();

		CheckMessages(
			TESTING ? ({ collection: [example_message] } as any) : messages
		);

		await Sleep(config.Interval);
	}
}

// OPEN SESAME
Main();
