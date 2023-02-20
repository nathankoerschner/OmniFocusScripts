/*{
    "author": "Nathan K",
    "targets": ["omnifocus"],
    "type": "action",
    "identifier": "com.mycompany.synch_with_trello",
    "version": "1.11",
	"description": "Update Trello boards to OmniFocus",
	"label": "Trello to OmniFocus",
	"shortLabel": "Trello to OmniFocus",
	"paletteLabel": "Trello to OmniFocus",
	"image": "gearshape"
}*/
(() => {
	const action = new PlugIn.Action(function (selection, sender) {
		// action code
		// selection options: columns, document, editor, items, nodes, outline, styles

		// Note: after a first sync, it's possible to rename the [begin] of the Trello
		// tags in OmniFocus. For example, a tag named "Trello : Waiting" could be renamed
		// to "Trello : [Clock emoticon] Waiting" without problems.

		// These parameters can be customized.
		projectsFolderName = "Projects"; // Name of the folder to search for trello cards
		ofTrelloTagName = "Trello"; // Name of the tag folder for Trello labels

		boardsToRead = []; // array of names of trello boards to synch
		listsToRead = []; // array of names of trello lists to synch

		// get your key at https://trello.com/1/appKey/generate
		trelloAppKey = "XXXXXXXXXXXX";

		// then get your token at
		// https://trello.com/1/authorize?key=**YOURKEY**&name=TrelloToOmniFocus&expiration=never&response_type=token&scope=read
		trelloUserToken = "XXXXXXXXXXXXXX";

		// *****************************************************
		// Add folder ofTrelloTagName if it doesn't already exist
		// *****************************************************
		ofTrelloTag = tags.byName(ofTrelloTagName);
		if (ofTrelloTag == null) {
			ofTrelloTag = new Tag(ofTrelloTagName);
		}

		// *****************************************************
		// Add folder projectsFolderName if it doesn't already exist
		// *****************************************************
		projectsFolder = folders.byName(projectsFolderName);
		if (projectsFolderName == null) {
			console.log("No projects folder found");
			projectsFolder = new Folder(projectsFolderName);
		}

		getTrelloRelatedTasks = () => {
			// get all tasks with the Trello tag
			// return an array of tasks
			return flattenedTasks.filter((task) => {
				return task.tags.includes(ofTrelloTag);
			});
		};

		inOmnifocus = getTrelloRelatedTasks();
		console.log(inOmnifocus);

		// *****************************************************
		// Mark all Trello tasks and projects as complete
		// Completes all tasks in the projectsFolder (grabbed via .flattenedProjects) which start with "Trello" in the name

		// *****************************************************
		// *****************************************************
		// Fetch my cards from Trello
		// Each fetch launch another fetch until we reach
		// function processCard
		// *****************************************************
		var the_url = URL.fromString(
			"https://trello.com/1/members/my/cards?fields=idList,name,url,desc,labels,due,idBoard&key=" +
				trelloAppKey +
				"&token=" +
				trelloUserToken
		);

		the_url.fetch(function (res) {
			var myCards = JSON.parse(res.toString());
			myCards.forEach(fetchBoard);
		});

		function fetchBoard(card) {
			var the_url = URL.fromString(
				"https://trello.com/1/boards/" +
					card.idBoard +
					"?fields=name,url&key=" +
					trelloAppKey +
					"&token=" +
					trelloUserToken
			);
			the_url.fetch(function (res) {
				board = JSON.parse(res.toString());
				fetchList(card, board);
			});
		}

		function fetchList(card, board) {
			var the_url = URL.fromString(
				"https://trello.com/1/cards/" +
					card.id +
					"/list?fields=name&key=" +
					trelloAppKey +
					"&token=" +
					trelloUserToken
			);
			the_url.fetch(function (res) {
				list = JSON.parse(res.toString());
				processCard(card, board, list);
			});
		}

		//////////////////////////////////////

		// Now, with the card, the board, and the list in hand, run the processCard function.

		function processCard(card, board, list) {
			if (boardsToRead.length != 0 && !boardsToRead.includes(board.name)) {
				return;
			}
			if (listsToRead.length != 0 && !listsToRead.includes(list.name)) {
				return;
			}

			findCardRepresentationInOmni = (card) => {
				// given a Trello card,
				// look through all of the objects to see if it's in Omnifocus
				// (as soon as it's found, return the object)
				// if it's not there, add it to the inbox as a task.

				found = [];

				// check for the card in the tasks
				for (i in inOmnifocus) {
					task = inOmnifocus[i];
					if (typeof task.note !== "undefined") {
						if (task.note.includes(card.id)) {
							found.push(task);
						}
					}
				}
				return found;
			};

			createTaskFromCard = (card) => {
				// add the given card to the inbox

				// create a new task in the inbox
				var task = new Task("Trello : " + card.name);
				task.note =
					"Trello Card #" +
					card.id +
					"\n" +
					"Card : " +
					card.url +
					"\n" +
					"--------------------------------";
				if (card.due == null) {
					task.dueDate = null;
				} else {
					task.dueDate = new Date(card.due);
				}
				task.addTag(ofTrelloTag);
			};

			foundInOmni = findCardRepresentationInOmni(card);
			console.log("foundInOmni", foundInOmni, foundInOmni.added);
			if (foundInOmni.length == 0) {
				createTaskFromCard(card);
			} else {
				for (i in foundInOmni) {
					obj = foundInOmni[i];
					trelloNotes =
						card.name +
						"Trello Card #" +
						card.id +
						"\n" +
						"Card : " +
						card.url +
						"\n" +
						"--------------------------------";
					if (card.due == null) {
						obj.dueDate = null;
					} else {
						obj.dueDate = new Date(card.due);
					}
					if (card.members) {
						trelloNotes += "\nMembers : ";
						card.members.forEach(function (member) {
							trelloNotes += member.fullName + " ";
						});
					}
					obj.note =
						trelloNotes +
						"\n" +
						obj.note.split("--------------------------------")[1];

					obj.markIncomplete();
				}
			}
		}
	});

	action.validate = function (selection, sender) {
		// validation code
		// selection options: columns, document, editor, items, nodes, outline, styles
		return true;
	};

	return action;
})();
