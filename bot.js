const discord = require("discord.js")
const bot = new discord.Client({disableEveryone: true})

bot.on("ready", async () => {
	
		console.log("Ready")
		let link = await bot.generateInvite(["SEND_MESSAGES","MANAGE_MESSAGES"])
		console.log(link)
		
})

bot.on("message", async message => {
	if(message.author.bot) return;
	if(message.content.includes("@")) return;
	
	if(message.channel.name == "emote-requests") {
		if(message.content.toLowerCase().startsWith("add")) {
			args = message.content.split(" ")
			if(!args[1]) return message.delete()
			if(!message.attachments.first()) return message.delete().then(message.author.send("Your request was rejected because it has no attachments. (links don't work!)"))
			if(message.attachments.first().size > 256000) return message.delete().then(message.author.send("Your request was rejected because the attachment is too large! Must be smaller than 256kb."))
			
			m = await message.channel.send(`:inbox_tray: **${message.author.tag}**\nAdd \`${args[1]}\``, {files: [message.attachments.first().proxyURL]})
			m.react("👍")
			m.react("👎")
			message.delete()
		}
		
		if(message.content.toLowerCase().startsWith("remove")) {
			args = message.content.split(" ")
			if(!args[1]) return message.delete()
			x = message.guild.emojis.cache.findKey(em => em.name == args[1])
			if(!x) return message.delete().then(message.author.send("Your request was rejected because you did not provide a valid emote. (use its name)"))
			y = message.guild.emojis.cache.get(x)
			res = await message.guild.emojis.resolve(y)
			
			m = await message.channel.send(`:outbox_tray: **${message.author.tag}**\nRemove \`${args[1]}\``, {files: [res.url]})
			m.react("👍")
			m.react("👎")
			message.delete()
		}
		
		if(message.content.toLowerCase().startsWith("rename")) {
			args = message.content.split(" ")
			if(!args[1]) return message.delete()
			if(!args[2]) return message.delete()
			x = message.guild.emojis.cache.findKey(em => em.name == args[1])
			if(!x) return message.delete().then(message.author.send("Your request was rejected because you did not provide a valid emote. (use its name)"))
			y = message.guild.emojis.cache.get(x)
			res = await message.guild.emojis.resolve(y)
			
			m = await message.channel.send(`:pencil2: **${message.author.tag}**\nRename \`${res.name}\` to \`${args[2]}\``, {files: [res.url]})
			m.react("👍")
			m.react("👎")
			message.delete()
		}
	}
})

bot.login(null); //log in with the token