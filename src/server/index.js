'use strict';
const DiscordRPC = require('discord-rpc');
const Config = require('./config');
const Client = new DiscordRPC.Client({ transport: Config.transport });
const HTTP = require('http');
const fetch = require('node-fetch')
let activity = {
    largeImageKey: 'studio',
    largeImageText: 'Developing in Roblox Studio',
    smallImageKey: 'idle',
    smallImageText: 'Idle',
    state: 'Waiting for Connection...',
    startTimestamp: 999999999999,
    partyId: '10',
}

Client.on('ready', () => {
    //CONF Logs
    console.log(`Using RPC For Application ID ${Client.clientId}`)
    console.log(`RPC Connected for ${Client.user.username}#${Client.user.discriminator}`)

    //INIT Activity
    Client.setActivity(activity)
});

HTTP.createServer((request, response) => {
    let data = {};
    let lastServerRequest = 0;
    let serverRecently = false;

    request.on('data', (reqData) => {
        data = JSON.parse(reqData);
    })

    request.on('end', async () => {
        if (data.RequestType == 'UPDATE') {
            try {
                if (data.EditMode && serverRecently) {
                    response.statusCode = 200;
                    return response.end();
                }
                const thisServerRequest = new Date().getTime()
                if (!data.EditMode) lastServerRequest = thisServerRequest; serverRecently = true;

                let gameThumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${data.UniverseId}&returnPolicy=0&size=512x512&format=Png&isCircular=false`)
                let gameThumb = (await gameThumbRes.json()).data[0].imageUrl

                activity.largeImageKey = "studio"
                activity.largeImageText = "Developing in Roblox Studio"

                switch (data.DevelopmentType) {
                    case "SOLO":
                        activity.partySize = 1
                        activity.partyMax = 1
                        activity.state = "Developing Solo"
                        break;
                    case "TEAM":
                        activity.partySize = 1
                        activity.partyMax = data.TeamSize
                        activity.state = "Team Collaboration"
                        break;
                    default:
                        break;
                }
                
                switch (data.Status) {
                    case "ACTIVE":
                        activity.smallImageKey = "active"
                        activity.smallImageText = "Active"
                        activity.details = data.WorkspaceDetails
                        activity.largeImageKey = data.DisplayGameIcon ? gameThumb : "studio"
                        activity.largeImageText = data.DisplayGameName ? data.GameName : "Developing in Roblox Studio"
                        break;
                    case "SCRIPTING":
                        activity.smallImageKey = "scripting"
                        activity.smallImageText = "Scripting"
                        activity.details = data.ScriptingDetails
                        activity.largeImageKey = data.DisplayGameIcon ? gameThumb : "studio"
                        activity.largeImageText = data.DisplayGameName ? data.GameName : "Developing in Roblox Studio"
                        break;
                    case "TESTING":
                        activity.smallImageKey = "testing"
                        activity.smallImageText = "Testing"
                        activity.details = undefined
                        activity.largeImageKey = data.DisplayGameIcon ? gameThumb : "studio"
                        activity.largeImageText = data.DisplayGameName ? data.GameName : "Testing in Roblox Studio"

                        switch (data.DevelopmentType) {
                            case "SOLO":
                                activity.partySize = 1
                                activity.partyMax = 1
                                activity.state = "Testing Solo"
                                break;
                            case "TEAM":
                                activity.partySize = 1
                                activity.partyMax = data.TeamSize
                                activity.state = "Team Test"
                                break;
                            default:
                                break;
                        }
                        break;
                    case "IDLE":
                        activity.smallImageKey = "idle"
                        activity.smallImageText = "Idle"
                        break;
                    case "BUSY":
                        activity.smallImageKey = "busy"
                        activity.smallImageText = "Busy"
                        break;
                    default:
                        break;
                }

                if (data.EnableTimestamp) {
                    activity.startTimestamp = data.Timestamp
                } else {
                    activity.startTimestamp = undefined
                }

                if (!data.DisplayDevelopmentType) { 
                    activity.partySize = undefined
                    activity.partyMax = undefined
                    activity.state = "Developing"
                }

                activity.buttons = []
               if (data.Buttons && data.Buttons.button0.title !== '' && data.Buttons.button0.url !== '') activity.buttons.push({
                label: data.Buttons.button0.title,
                url: data.Buttons.button0.url,
               })
               if (data.Buttons && data.Buttons.button1.title !== '' && data.Buttons.button1.url !== '') activity.buttons.push({
                label: data.Buttons.button1.title,
                url: data.Buttons.button1.url,
               })
               if (activity.buttons.length < 1) activity.buttons = undefined

                //SET Activity
                Client.setActivity(activity)
                console.log(`Received Updated Activity Status @ ${new Date().toTimeString()}`)
                response.statusCode = 200;
                response.end();
                
                if (!data.EditMode){
                    setTimeout(async () => {
                        console.log('THIS REQUEST: ' + thisServerRequest, "\nLAST REQUEST: " + lastServerRequest, '\n--------')
                        if ((lastServerRequest == thisServerRequest) || lastServerRequest == 0) serverRecently = false; lastServerRequest = 0;
                    }, 5000)
                }
            } catch (error) {
                console.log(error)
            }
        } else if (data.RequestType == 'END') {
            activity = undefined
            activity = {
                largeImageKey: 'studio',
                largeImageText: 'Developing in Roblox Studio',
                smallImageKey: 'idle',
                smallImageText: 'Idle',
                state: 'Waiting for Connection...',
                startTimestamp: 999999999999,
                partyId: '10',
            }

            Client.setActivity(activity)

            console.log(`Activity Status Disabled @ ${new Date().toTimeString()}`)
            response.statusCode = 200;
            response.end();
        }
    })

}).listen(65535)
console.log('HTTP Server Launched on port 65535')

Client.login({ clientId: Config.clientId, scopes: Config.scopes });