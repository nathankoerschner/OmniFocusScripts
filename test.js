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
	const action = new PlugIn.Action(function(selection, sender){
		// action code
		// selection options: columns, document, editor, items, nodes, outline, styles


		// Note: after a first sync, it's possible to rename the [begin] of the Trello
		// tags in OmniFocus. For example, a tag named "Trello : Waiting" could be renamed
		// to "Trello : [Clock emoticon] Waiting" without problems.

		// These parameters can be customized.
		projectsFolderName = 'Projects'  // Name of the folder to search for trello cards
		ofTrelloTagName = 'Trello'     // Name of the tag folder for Trello labels

		// get your key at https://trello.com/1/appKey/generate
		trelloAppKey = "XXXXXXXXXXXX"

		// then get your token at
		// https://trello.com/1/authorize?key=**YOURKEY**&name=TrelloToOmniFocus&expiration=never&response_type=token&scope=read
		trelloUserToken = "XXXXXXXXXXXXXX"

	
		// *****************************************************
		// Add folder ofTrelloTagName if it doesn't already exist
		// *****************************************************
		ofTrelloTag = tags.byName(ofTrelloTagName)
		if (ofTrelloTag == null) {
			ofTrelloTag = new Tag(ofTrelloTagName)
		}

		// *****************************************************
		// Add folder projectsFolderName if it doesn't already exist
		// *****************************************************
		projectsFolder = folders.byName(projectsFolderName)
x		if (projectsFolderName == null) {
			console.log("No projects folder found")
			projectsFolder = new Folder(projectsFolderName)
		}
	
		projectsList = projectsFolder.flattenedProjects
	
		// *****************************************************
		// Mark all Trello tasks and projects as complete
		// Completes all tasks in the projectsFolder (grabbed via .flattenedProjects) which start with "Trello" in the name

		// *****************************************************
		projectsFolder.forEach(
			function complete(project){
				project.tasks.forEach(
					function complete(task){
						if (task.name.startsWith("Trello :")) {
							task.markComplete()
						}
					})
				// project.markComplete() ///// This will likely be re-included.
			})
	
		// *****************************************************
		// Fetch my cards from Trello
		// Each fetch launch another fetch until we reach
		// function processCard
		// *****************************************************
		var the_url = URL.fromString(
			"https://trello.com/1/members/my/cards?fields=idList,name,url,desc,labels,due,idBoard&key=" +
			trelloAppKey + "&token=" + trelloUserToken)

		the_url.fetch(function(res){
			var myCards = JSON.parse(res.toString())
			myCards.forEach(fetchBoard)
		})

		// first, get all of the cards in hand. 
		// then, from each card, get the corrisponding board and list. 

		/////////////////////////////
		
		function fetchBoard(card){
			var the_url = URL.fromString(
				"https://trello.com/1/boards/" + card.idBoard +
				"?fields=name,url&key=" + trelloAppKey + "&token=" + trelloUserToken)
			the_url.fetch(function(res){
				board = JSON.parse(res.toString())
				fetchList(card, board)
			})
		}
		
		function fetchList(card, board){
			var the_url = URL.fromString(
				"https://trello.com/1/cards/" + card.id +
				"/list?fields=name&key=" + trelloAppKey + "&token=" +
				trelloUserToken)
			the_url.fetch(function(res){
				list = JSON.parse(res.toString())
				if (board in boardsToRead && list in listsToRead) {
					processCard(card, board, list)
				}
			})
		}

		//////////////////////////////////////

		// Now, with the card, the board, and the list in hand, run the processCard function.


		function processCard(card, board, list){
			// Basically, this function takes a specific card board list tuple and ensures that omnifocus is duplicating that as a task project tag tuple in omnifocus
			///////////////////////////////////////////////////////
			//console.log(board.name + ' ' + list.name + ' ' + card.name)

			//// Grab the names of the project and task that represnt this card and board in omnifocus.

			var projectName = board.name      
			var taskName = "Trello : " + list.name + " : " + card.name

			
			/////////////////////////////////////////////////////

			// Find the corresponding project in OF, create it if it doesn't exist

			// this first function is used as a filter, to grab only the project with the matching board #
			function projectHasID(project){
				return project.note.startsWith("Trello Board #" + board.id)
			}

			// Look at all of the projects within the ofTrelloFolder
			var project = ofTrelloFolder.flattenedProjects.find(projectHasID)

			// if no project is found to match the board in Trello, then create a project in the choosen folder. 
			// Fill the projects notes field. 
			if (project == null) {
				project = new Project(projectName, ofTrelloFolder)
				project.note = "Trello Board #" + board.id + "\n" +
					"Board : " + board.url + "\n" +
					"--------------------------------"
			} 
			
			// Otherwise (if a project representing this board is found) then update the project's name based on the boards current name 
			// (the board's name may have changed, since we are matching these based on the ID of the board and not the name.)

			// this also reveals part of the mechanic of how this script works—-since at the start everything is marked complete, then that is the accounting of items for which the program then marks each incomplete as they are accounted for. 
			else {
				project.name = projectName
				project.markIncomplete()
			}

			//////////////////////////////////////////////////

			// Find the corresponding task in OmniFocus, create it if it doesn't exist

			// Similar to the above function for processing the projects, this function is used as a filter to find cards with the matching card ID. 
			function taskHasID(task){
				return task.note.startsWith("Trello Card #" + card.id)
			}
			var task = project.tasks.find(taskHasID)
			if (task == null) {
				task = new Task(taskName, project)
				task.note = "Trello Card #" + card.id + "\n" +
					"Card : " + card.url + "\n" +
					"Board : " + board.url + "\n" +
					"--------------------------------"
			} else {
				task.name = taskName
				task.markIncomplete()
				project.markIncomplete()
			}
			// In every case:
			if (card.due == null) {
				task.dueDate = null
			} else {
				task.dueDate = new Date(card.due)
			}
			
			
			// Labels
			
			// Remove all tags in the task that are Trello labels
			ofTrelloTag.children.forEach(
				function deleteTask(tag){
					task.removeTag(tag)
				}
			)
			
			card.labels.forEach(
				function processLabel(label){
					tagName = label.name
					// console.log(label.name)

					// Find the corresponding tag in OmniFocus, or create it.
					function tagHasName(tag){
						return tag.name.endsWith(tagName)
					}
					var tag = ofTrelloTag.children.find(tagHasName)
					if (tag == null) {
						tag = new Tag(tagName, ofTrelloTag)
					}
					
					// Add the tag to the task in OmniFocus
					task.addTag(tag)
					
				}
			)		
		}


	});

	action.validate = function(selection, sender){
		// validation code
		// selection options: columns, document, editor, items, nodes, outline, styles
		return true
	};
	
	return action;
})();
