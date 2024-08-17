const { Client, GatewayIntentBits, REST, Events, Routes, Collection, range, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('fs');
const { token, clientId, server_ip, edition, widget, embed } = require('./config.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.commands = new Collection();
const commands = []

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}


const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

//Serveur Status

const axios = require('axios')
const cron = require('node-cron');
const data = require('./data/data.json')


async function getServeurEmbedStatus(ip) {
    await axios.get(`https://api.mcstatus.io/v2/status/${edition}/${ip}`)
        .then(async (response) => {
            const files = []
            const exampleEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(embed.title)
                .addFields(
                    { name: 'Server name', value: '``' + embed.title + '``' },
                )
                .setTimestamp()

            if (response.data.online == true) {
                exampleEmbed.addFields({ name: 'Server Status', value: '``🟢 Online``' })
            } else {
                exampleEmbed.addFields({ name: 'Server Status', value: '``🔴 Offline``' })
            }

            exampleEmbed.addFields(
                { name: 'IP', value: '``' + ip + '``' },
            )

            if (response.data.players && typeof response.data.players.online !== 'undefined') {
                exampleEmbed.addFields({ name: 'Players', value: '``' + `${response.data.players.online} / ${response.data.players.max}` + '``' });
            }

            if (embed.logo) {
                exampleEmbed.setThumbnail(`attachment://${path.basename(embed.logo)}`)
                files.push(embed.logo);
            }

            if (embed.image) {
                exampleEmbed.setImage(`attachment://${path.basename(embed.image)}`)
                files.push(embed.image);
            }

            if (data.embed_id) {
                const message = await client.channels.cache.get(embed.channel_id).messages.fetch(data.embed_id)
                message.edit({ embeds: [exampleEmbed], files: files })
            } else {
                const message = await client.channels.cache.get(embed.channel_id).send({ embeds: [exampleEmbed], files: files })

                fs.readFile("./data/data.json", 'utf8', (err, data) => {
                    if (err) {
                        console.error('Erreur de lecture du fichier:', err);
                        return;
                    }

                    try {
                        const jsonData = JSON.parse(data);

                        jsonData.embed_id = message.id;

                        const updatedJsonData = JSON.stringify(jsonData, null, 2);

                        fs.writeFile("./data/data.json", updatedJsonData, 'utf8', (err) => {
                            if (err) {
                                console.error('Erreur d\'écriture du fichier:', err);
                                return;
                            }
                        });
                    } catch (parseErr) {
                        console.error('Erreur de parsing du JSON:', parseErr);
                    }
                });
            }

        }).catch((error) => {
            if (error.name == "DiscordAPIError[10008]") {
                console.log("embed error : Unknown Message, the message in ./data/data.json has been deleted. Remove the id in the file.")
            }
            if (error.message == "Cannot read properties of undefined (reading 'messages')") {
                console.log("embed error : Cannot retrieve the latest status messages. The channel may have been deleted or the ID in config.json may be incorrect.")
            }
        });

}

async function getWidget(ip) {
    try {
        const response = await axios.get(`https://api.mcstatus.io/v2/widget/java/${ip}?dark=${widget.dark}`, {
            responseType: 'arraybuffer'// Utiliser arraybuffer pour les données binaires
        });

        if (data.widget_id) {

            filePath = path.join(__dirname + '/img/', 'widget.png');
            fs.writeFileSync(filePath, response.data);


            const attachment = new AttachmentBuilder("./img/widget.png", { name: 'widget.png' })

            const message = await client.channels.cache.get(widget.channel_id).messages.fetch(data.widget_id)
            message.edit({ files: [attachment] })
        } else {
            filePath = path.join(__dirname + '/img/', 'widget.png');
            fs.writeFileSync(filePath, response.data);


            const attachment = new AttachmentBuilder("./img/widget.png", { name: 'widget.png' })

            const message = await client.channels.cache.get(widget.channel_id).send({ files: [attachment] })

            fs.readFile("./data/data.json", 'utf8', (err, data) => {
                if (err) {
                    console.error('Erreur de lecture du fichier:', err);
                    return;
                }

                try {
                    const jsonData = JSON.parse(data);

                    jsonData.widget_id = message.id;

                    const updatedJsonData = JSON.stringify(jsonData, null, 2);

                    fs.writeFile("./data/data.json", updatedJsonData, 'utf8', (err) => {
                        if (err) {
                            console.error('Erreur d\'écriture du fichier:', err);
                            return;
                        }
                    });
                } catch (parseErr) {
                    console.error('Erreur de parsing du JSON:', parseErr);
                }
            });
        }
    } catch (error) {
        if (error.name == "DiscordAPIError[10008]") {
            console.log("widget error : Unknown Message, the message in ./data/data.json has been deleted. Remove the id in the file.")
        }
        if (error.message == "Cannot read properties of undefined (reading 'messages')") {
            console.log("widget error : Cannot retrieve the latest status messages. The channel may have been deleted or the ID in config.json may be incorrect.")
        }
    }

}


client.on("ready", async (event) => {
    cron.schedule('*/5 * * * *', () => {//running every five minutes
        if (embed.channel_id) {
            getServeurEmbedStatus(server_ip)
        }

        if (widget.channel_id) {
            getWidget(server_ip)
        }


    })
});

client.login(token);