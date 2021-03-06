const express = require('express')
const {allRooms} = require("../model/gameplay/roomsModule")
const {player} = require("../model/gameplay/objectsModule")
const {parseAction, walk, read, take, use, enter, displayInventory, open} = require("../model/gameplay/actionsModule")
let router = express.Router()

const createSceneText = (description, message=null) => `
<!DOCTYPE html>
<html>
<head>
    <title>Riddle Adventure</title>
</head>
<body>
    <p> 
        ${message || ''}
    </p>    
    <p> 
        ${description}
    </p>   
    <form action="/play" method="post">
        <input type="text" name="input" autofocus>
    </form>
</body>
</html>
`

router.get('/', (req, res) => res.redirect('/play/room0/x2y1'))

//this router handles arriving at a scene and producing a response.
//get the room param and corresponding Room object in the allRooms object,
//get the vector param, 
//update player's location, 
//use vector to get the description from currentRoom 
//define added message from query params
//create scene html and send
router.get('/:room/:vector', (req, res) => {
    let room = req.params.room
    let vector = req.params.vector
    let message = req.query.message
    let description = allRooms[room].vectors[vector].description
    let finalSceneCond = (
        room === 'room1' && 
        vector === 'x3y5' && 
        'cinnabun' in player.inventory
    ) 

    //conditional for final scene
    if (finalSceneCond) 
        description = allRooms[room].vectors[vector].specialDescription
    
    player.currentRoom = room
    player.currentVector = vector
    res.send(createSceneText(description, message))
})

//all POST requests come in from the html form that the user
//plays the game with. The code inside this POST handler uses 'parseAction()'
//to parse the user's input into a function (action), and what to perform
//the function on (noun). Every possible 'action' function can operate with
//some combination of the inputted noun, the currentVectorObject
//and the player.currentRoom. The exception of 'displayInventory()' just uses the player object.
router.post('/', (req, res) => {
    let {action, noun} = parseAction(req.body.input)
    let currentVectorObject = allRooms[player.currentRoom].vectors[player.currentVector]
    let interactableContent = currentVectorObject.interactableContent
    let inventory = player.inventory
    let inGameDirectory = req.get('referer').replace(/(.*)=(\w+)\W.*/i, '\$2')

    //run conditional checks to change the status of features in the room.
    //if statement about whether the 'X' variable feature is true/false
    //responding code to change the 'Y' variable feature.



    //addMessage function is very critical to the logic of the game.
    //grab the referer and remove old message query param, 
    //then direct back to the same scene with new message.
    const addMessage = (message) => {
        let referer = req.get('referer').replace(/(.+)\?(.+)/, '\$1')

        res.redirect(`${referer}?message=${message}`)
    }

    //walk function generates the vector that player is about to walk to.
    if (['walk', 'go', 'head', 'run'].includes(action)) {
        let nextVector = walk(currentVectorObject, noun)

        if (nextVector) 
            res.redirect(`/play/${player.currentRoom}/${nextVector}`) 
        
        else 
            addMessage("You can't walk there.")
    }
    //enter function generates the route to the next room. 
    //It is the 'route' attribute of the door nested in that vector object.
    else if (action === 'enter') {
        let nextRoute = enter(interactableContent.door)

        if (nextRoute) 
            res.redirect(nextRoute)

        else 
            addMessage("You can't do that.")
    }
    //open function returns text to be displayed above the scene description.
    //This is convenient to use addMessage() 
    else if (action === 'open') {
        let openMessage = open(interactableContent, noun) || "There's nothing to open here."

        addMessage(openMessage)
    }
    //the inventory function returns text representing contents of
    //player's inventory attribute. using addMessage()
    else if (action === 'inventory') {
        let inventoryMessage = displayInventory(inventory)

        addMessage(inventoryMessage)
    }
    //the take function will add the object to player's inventory, and return a little message.
    //the open function will display the chest again for continuity, if there is one.
    else if (action === 'take' || action === 'grab') {
        let takeMessage = take(interactableContent, noun, player, inGameDirectory) || "There's nothing to take here."
        let openMessage = open(interactableContent, inGameDirectory) || ''

        addMessage(openMessage + '<br>' + takeMessage)
    }
    //read function
    //check whether the player is in a chest, or their inventory.
    //add the read message. depending on which directory the player is in,
    //make sure to return to the same description that was on screen for continuity.
    else if (['read', 'look', 'see'].includes(action)){
        let readMessage = read(currentVectorObject, noun, inventory, inGameDirectory)

        if (['chest', 'desk', 'lunchbox'].includes(inGameDirectory)) {
            let openMessage = open(interactableContent, inGameDirectory)

            addMessage(openMessage + '<br>' + readMessage)
        }
        else if (inGameDirectory === 'Inventory') {
            let inventoryMessage = displayInventory(inventory)

            addMessage(inventoryMessage + '<br>' + readMessage)
        }
        else {
            addMessage(readMessage) 
        }
    }
    else if (['yes', 'no'].includes(action)) {
        //panel press in room0 - makes door enterable
        //can't pass room1 until you give cinnabun to security guard
        if ('interactKey' in interactableContent) {
            if (action === 'yes') {
                interactableContent.changeInteractKey()
                interactableContent.interactFunction()
                addMessage(interactableContent.interactMessage)
            }
            else {
                addMessage('Chose not to.')
            }
        } 
        else {
            addMessage("You can't do that here.")
        }
    }
    //'action' variable is not a function
    else {
        addMessage("I don't understand that.")
    }
})

module.exports = router