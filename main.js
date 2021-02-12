const discord = require("discord.js")
const mysql = require('mysql')
const cfg = require("./config.json")
const bot = new discord.Client({disableEveryone: true})
var con = mysql.createConnection({
  host: cfg.sql.host,
  user: cfg.sql.user,
  password: cfg.sql.password,
  database: cfg.sql.database
})
prefix = cfg.prefix
timeout = cfg.timeout

lastcommand = Date.now()
recent = []
scoreCache = []

con.connect(err => {if(err) throw err; console.log("Connected to database")})

bot.on("ready", async () => {
	
		console.log("Ready")
		let link = await bot.generateInvite(["SEND_MESSAGES"])
		console.log(link)
		
		con.query("SELECT * FROM users", (err,rows) => {
			t = Date.now()
			console.log(`Calulating scores for ${rows.length} users`)
			for(user of rows) {
				scoreCache.push({
					'id': user.id,
					'score': Math.round((user.rsent/2)+user.rrecv)
				})
			}
			console.log(`Finished calculating ${rows.length} scores`)
		})
		
})

function resolveEmoteTagFromId(id) {
	emote = bot.emojis.cache.filter(x => x.id == id).first()
	if(!emote) return "Unavailable Emote"
	if(!emote.animated) {
	tag = `<:${emote.name}:${id}>`
	} else tag = `<a:${emote.name}:${id}>`
	emote = tag
	return emote
}

function resolveUserFromId(id) {
	//user = bot.users.cache.filter(x => x.id == id).first()
	//if(!user) user = {id: id}
	return `<@${id}>`
}

function updateScoreCache(id, score) {
	if(scoreCache.filter(x => x.id == id)[0]) {
		scoreCache.filter(x => x.id == id)[0].score = score
	} else {
		scoreCache.push({
			'id': id,
			'score': score
		})
	}
}

function calculateScore(rsent, rrecv) {
	return Math.round((rsent/2)+rrecv)
}

bot.on("message", message => {
	if(message.author.id == bot.user.id) return
	msgArray = message.content.split(" ")
	
	for(i=0;i<msgArray.length;i++) {
		if(msgArray[i].startsWith("<:")||msgArray[i].startsWith("<a:") && msgArray[i].endsWith(">")) {
			if(!msgArray[i].endsWith(">")) return
			if(msgArray[i].includes("'")||msgArray[i].includes(";")) return
			id = msgArray[i].slice(-19,-1)
			
			con.query(`SELECT * FROM emotes WHERE id = '${id}'`, (err,rows) => {
				if(err) throw err
				if(rows.length < 1) {
					con.query(`INSERT IGNORE INTO emotes (id, uses, messages, reacts) VALUES ('${id}', 1, 1, 0)`)
				} else {
					con.query(`UPDATE emotes SET uses = ${rows[0].uses+1} WHERE id = '${id}'`)
					con.query(`UPDATE emotes SET messages = ${rows[0].messages+1} WHERE id = '${id}'`)
				}
			})
			break
		}
	}
	
	//Emote uses
	if(message.content.startsWith(prefix + "uses")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		if(message.channel.recipient) return
		if(!msgArray[1]) return
		if(message.content.includes("'")||message.content.includes(";")) return
		
		if(msgArray[1].startsWith("<:")||msgArray[1].startsWith("<a:") && msgArray[1].endsWith(">")) {
			id = msgArray[1].slice(-19,-1)
			
			if(!id) return
			if(isNaN(id)) return
			if(!bot.emojis.cache.filter(x => x.id == id)) return
		} else if(message.guild.emojis.cache.filter(x => x.name == msgArray[1])) {
			if(!message.guild.emojis.cache.filter(x => x.name == msgArray[1]).first()) return
			id = message.guild.emojis.cache.filter(x => x.name == msgArray[1]).first().id
		} else return
		
		con.query(`SELECT * FROM emotes`, (err,rows) => {
			sorted = rows.sort(function(a, b) {return a.uses - b.uses})
			sorted.reverse()
			
			row = rows.filter(x => x.id == id)[0]
			
			if(!row) return message.reply("I haven't logged that emote yet. (this likely means that it has never been used)")
			pos = sorted.indexOf(row)+1
			message.reply(`${resolveEmoteTagFromId(id)} has been used ${row.uses} times. \n💬 **Messages:** ${row.messages}\n😀 **Reactions:** ${row.reacts}\n📈 **Position:** #${sorted.indexOf(row)+1}`)
		})
		return
	}
	
	//Emote add timestamp
	if(message.content.startsWith(prefix + "added")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		if(!msgArray[1]) return
		if(message.content.includes("'")||message.content.includes(";")) return
		
		if(msgArray[1].startsWith("<:")||msgArray[1].startsWith("<a:") && msgArray[1].endsWith(">")) {
			id = msgArray[1].slice(-19,-1)
			
			if(!id) return
			if(isNaN(id)) return
			if(!bot.emojis.cache.filter(x => x.id == id)) return
		} else if(bot.emojis.cache.filter(x => x.name == msgArray[1])) {
			if(!bot.emojis.cache.filter(x => x.name == msgArray[1]).first()) return
			id = bot.emojis.cache.filter(x => x.name == msgArray[1]).first().id
		} else return
	
		message.reply(bot.emojis.cache.get(id).createdAt.toGMTString())
	}
	
	//User stats
	if(message.content.startsWith(prefix + "stats")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		target = bot.users.cache.filter(x => x.tag.toLowerCase().startsWith(msgArray.slice(1).join(" "))).first()||message.mentions.users.first()||{'id': msgArray[1]}
		if(!msgArray[1]) target = message.author
		
		con.query(`SELECT * FROM users`, (err,rows) => {
			row = rows.filter(x => x.id == target.id)[0]
			if(!row) return message.reply("No users found")
			
			rsentSorted = rows.sort(function(a, b) {return a.rsent - b.rsent})
			rsentSorted.reverse()
			rsentPos = rsentSorted.indexOf(row)+1
		
			rrecvSorted = rows.sort(function(a, b) {return a.rrecv - b.rrecv})
			rrecvSorted.reverse()
			rrecvPos = rrecvSorted.indexOf(row)+1
			
			user = bot.users.cache.get(target.id)
			message.reply(`**${user ? user.tag : msgArray[1]}**\n🔹 **Score:** ${calculateScore(row.rsent, row.rrecv)}\n📤 **Reactions sent:** ${row.rsent} (#${rsentPos})\n📥 **Reactions received:** ${row.rrecv} (#${rrecvPos})`)
		})
		return
	}
	
	//Help
	if(message.content.startsWith(prefix + "help")) {
		message.reply("++uses [emote] to get info about an emote\n++stats [user, leave blank for yourself] to get info about a user\n++leaderboard to check leaderboards\n++random to get a random emote\n++user for a random user\n++search [name] to look for emotes (modifiers: `-g` to only show emotes from this server)")
	}
	
	//Bot info
	if(message.content.startsWith(prefix + "info")||message.content.startsWith(prefix + "about")) {
		message.reply(`Emoticore provides emote usage statistics for servers.\nIt is currently private, though if you own a large server which needs a way to track emote usage, ask ${cfg.ownerTag}\n\nSee ++help for commands`)
	}
	
	//"Invite"
	if(message.content.startsWith(prefix + "invite")) {
		message.reply(`Emoticore is currently private.\n\n++about for more info`)
	}
	
	//Leaderboards
	if(message.content.startsWith(prefix + "leaderboard")||message.content.startsWith(prefix + "lb")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		if(!msgArray[1]) return message.reply("Which leaderboard would you like to see?\nmost-used - most used emotes\nmost-reacts-sent - most reactions sent\nmost-reacts-received - most reactions received\ntype `++leaderboard [your choice]`")
		
		if(msgArray[1] == "most-used"||msgArray[1] == "uses") {
			//worst page system ever created by mankind
			//but it works
			start = parseInt(msgArray[2])-1||0
			start *= 5
			con.query(`SELECT * FROM emotes`, (err,rows) => {
				sorted = rows.sort(function(a, b) {return a.uses - b.uses})
				sorted.reverse()
				if(start < 0||start > sorted.length-5) return message.reply("Invalid page")
				
				str = ""
				for(i=0;i<5;i++) {
					str += `${1+(start+i)}. ${resolveEmoteTagFromId(sorted[start+i].id)} | ${sorted[start+i].uses}\n`
				}
				
				emb = new discord.MessageEmbed()
					.setTitle("Global Leaderboard | Most used emotes")
					.setDescription(str)
					.setFooter(`${start+1}-${start+5} of ${sorted.length} | ++lb uses [page] to jump to page`)
				return message.reply(emb)
			})
		}
		
		if(msgArray[1] == "most-reacts-sent"||msgArray[1] == "rsent") {
			start = parseInt(msgArray[2])-1||0
			start *= 5
			con.query(`SELECT * FROM users`, (err,rows) => {
				sorted = rows.sort(function(a, b) {return a.rsent - b.rsent})
				sorted.reverse()
				if(start < 0||start > sorted.length-5) return message.reply("Invalid page")
				
				str = ""
				for(i=0;i<5;i++) {
					str += `${1+(start+i)}. ${resolveUserFromId(sorted[start+i].id)} | ${sorted[start+i].rsent}\n`
				}
				
				emb = new discord.MessageEmbed()
					.setTitle("Global Leaderboard | Most reacts sent")
					.setDescription(str)
					.setFooter(`${start+1}-${start+5} of ${sorted.length} | ++lb rsent [page] to jump to page`)
				return message.reply(emb)
			})
		}
		
		if(msgArray[1] == "most-reacts-received"||msgArray[1] == "rrecv") {
		start = parseInt(msgArray[2])-1||0
			start *= 5
			con.query(`SELECT * FROM users`, (err,rows) => {
				sorted = rows.sort(function(a, b) {return a.rrecv - b.rrecv})
				sorted.reverse()
				if(start < 0||start > sorted.length-5) return message.reply("Invalid page")
				
				str = ""
				for(i=0;i<5;i++) {
					str += `${1+(start+i)}. ${resolveUserFromId(sorted[start+i].id)} | ${sorted[start+i].rrecv}\n`
				}
				
				emb = new discord.MessageEmbed()
					.setTitle("Global Leaderboard | Most reacts received")
					.setDescription(str)
					.setFooter(`${start+1}-${start+5} of ${sorted.length} | ++lb rrecv [page] to jump to page`)
				return message.reply(emb)
			})
		}
		if(msgArray[1] == "score"||msgArray[1] == "sc") {
		start = parseInt(msgArray[2])-1||0
			start *= 5
			sorted = scoreCache.sort(function(a, b) {return a.score - b.score})
			sorted.reverse()
			if(start < 0||start > sorted.length-5) return message.reply("Invalid page")
				
			str = ""
			for(i=0;i<5;i++) {
				str += `${1+(start+i)}. ${resolveUserFromId(sorted[start+i].id)} | ${sorted[start+i].score}\n`
			}
				
			emb = new discord.MessageEmbed()
				.setTitle("Global Leaderboard | Top scores")
				.setDescription(str)
				.setFooter(`${start+1}-${start+5} of ${sorted.length} | ++lb sc [page] to jump to page`)
			return message.reply(emb)
		}
		return
	}
	
	//Random emote
	if(message.content.startsWith(prefix + "random")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
	
		con.query(`SELECT * FROM emotes WHERE id = ${bot.emojis.cache.randomKey()}`, (err,rows) => {
			row = rows[0]
			if(!row) return message.reply("Failed to get a random emote")
			
			message.reply(`${resolveEmoteTagFromId(row.id)} has been used ${row.uses} times. \n💬 **Messages:** ${row.messages}\n😀 **Reactions:** ${row.reacts}`)
		})
		return
	}
	
	//Random user
	if(message.content.startsWith(prefix + "user")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		con.query(`SELECT * FROM users`, (err,rows) => {
			row = rows[Math.round(Math.random()*rows.length)]||rows[0]
			
			emb = new discord.MessageEmbed()
				.setDescription(`${resolveUserFromId(row.id)} has received ${row.rrecv} reactions and sent ${row.rsent} reactions`)
			message.reply(emb)
		})
		return
	}
	
	//Find emotes
	if(message.content.startsWith(prefix + "search")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		if(!msgArray[1]) return
		
		q = msgArray[1]
		results = msgArray[2] == "-g" ? message.guild.emojis.cache.filter(x => x.name.toLowerCase().includes(q)) : bot.emojis.cache.filter(x => x.name.toLowerCase().includes(q))
		bot.emojis.cache.filter(x => x.name.toLowerCase().includes(q))
		if(!results.first()) return
		arr = results.keyArray()
		
		str = "Found some emotes:\n"
		for(i=0;i<15;i++) {
			if(!results.get(arr[i])) break
			str += `${resolveEmoteTagFromId(results.get(arr[i]).id)} | ${results.get(arr[i]).name}\n`
		}
		if(results.size > 15) str += `+${results.size-15} more emotes`
		message.reply(str)
	}
	
	//Get emote link
	if(message.content.startsWith(prefix + "em")) {
		if(!msgArray[1]) return
		
		if(msgArray[1].startsWith("<:")||msgArray[1].startsWith("<a:") && msgArray[1].endsWith(">")) {
			id = msgArray[1].slice(-19,-1)
			
			if(!id) return
			if(isNaN(id)) return
			if(!bot.emojis.cache.filter(x => x.id == id)) return
		} else if(bot.emojis.cache.filter(x => x.name == msgArray[1])) {
			if(!bot.emojis.cache.filter(x => x.name == msgArray[1]).first()) return
			id = bot.emojis.cache.filter(x => x.name == msgArray[1]).first().id
		} else return
		
		t = bot.emojis.cache.get(id)
		
		message.reply(t ? t.url : `https://cdn.discordapp.com/emojis/${id}.${msgArray[1].startsWith("<a:") ? "gif" : "png"}`)
		//the line above is a bit confusing so:
		//if the emote exists in the bot's cache, reply with the url
		//if it cannot access the emote, manually construct a link
	}
	
	//Log channel
	if(message.content.startsWith(prefix + "log-channel")) {
		if(message.channel.recipient) return //how to check if a message is in a dm in the worst possible way
		if(!message.member.hasPermission("MANAGE_MESSAGES")) return
		if(!message.mentions.channels.first()) return con.query(`SELECT * FROM settings WHERE server = '${message.guild.id}'`, (err,rows) => {if(rows.length > 0) {con.query(`DELETE FROM settings WHERE server = '${message.guild.id}'`); message.reply("I will no longer log events in this server.")}})
		
		con.query(`SELECT * FROM settings WHERE server = '${message.guild.id}'`, (err,rows) => {
			if(rows.length == 0) con.query(`INSERT INTO settings (server, channel) VALUES ('${message.guild.id}', '${message.mentions.channels.first().id}')`)
			
			con.query(`UPDATE settings SET channel = ${message.mentions.channels.first().id} WHERE server = '${message.guild.id}'`)
			message.reply("Channel set! I'm sending a message to the channel to verify that it's the right one.\n\nIf no message appears, check my permissions!")
			bot.channels.fetch(message.mentions.channels.first().id).then(c => c.send("This is a test message..."))
		})
	}
	
	//Run SQL query
	if(message.content.startsWith(prefix + "query")) {
		if(!cfg.allowEval) return message.reply("This command is disabled")
		if(message.author.id !== cfg.owner) return message.reply("Access denied")
		
		q = msgArray.slice(1).join(" ")
		
		con.query(q, (err,rows) => {
			message.reply(rows.message||`Query OK (${rows.length} rows)`)
		})
	}
	
	//Eval
	if(message.content.startsWith(prefix + "eval")) {
		if(!cfg.allowEval) return message.reply("This command is disabled")
		if(message.author.id !== cfg.owner) return message.reply("Access denied")
		
		str = msgArray.slice(1).join(" ")
		eval(str)
	}
	
	//Testing command
	//if(message.content.startsWith(prefix + "testcommand")) {
	//	console.log(recent)
	//}
})

bot.on("messageReactionAdd", async (react) => {
	if(cfg.logReactions) console.log(`${react.users.cache.last().tag} reacted with ${react.emoji.name} to ${react.message.author.tag}`)
	
	//This keeps track of reactions which were added recently
	//Entries are automatically removed after 1.5 seconds
	recent.push({
		ts: Date.now(),
		user: react.users.cache.last().id,
		message: react.message.id,
		messageChannel: react.message.channel.id,
		messageGuild: react.message.guild.id,
		emoji: react.emoji.name + " | " + react.emoji.url||react.emoji.name
	})
	
	setTimeout(() => {recent.splice(recent.findIndex(x => x.ts == Date.now()),1)},1500)
	
	if(!react.emoji.id) return
	
	con.query(`SELECT * FROM emotes WHERE id = '${react.emoji.id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT IGNORE INTO emotes (id, uses, messages, reacts) VALUES ('${react.emoji.id}', 1, 0, 1)`)
		} else {
			con.query(`UPDATE emotes SET uses = ${rows[0].uses+1} WHERE id = '${react.emoji.id}' LIMIT 1`)
			con.query(`UPDATE emotes SET reacts = ${rows[0].reacts+1} WHERE id = '${react.emoji.id}' LIMIT 1`)
		}
	})
	
	con.query(`SELECT * FROM users WHERE id = '${react.message.author.id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT IGNORE INTO users (id, rrecv, rsent) VALUES ('${react.message.author.id}', 1, 0)`)
		} else {
			con.query(`UPDATE users SET rrecv = ${rows[0].rrecv+1} WHERE id = '${react.message.author.id}'`)
			updateScoreCache(react.message.author.id, calculateScore(rows[0].rsent, rows[0].rrecv))
		}
	})
	
	con.query(`SELECT * FROM users WHERE id = '${react.users.cache.last().id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT IGNORE INTO users (id, rrecv, rsent) VALUES ('${react.users.cache.last().id}', 0, 1)`)
		} else {
			if(!react.users.cache.last()) return
			con.query(`UPDATE users SET rsent = ${rows[0].rsent+1} WHERE id = '${react.users.cache.last().id}'`)
			updateScoreCache(react.users.cache.last().id, calculateScore(rows[0].rsent, rows[0].rrecv))
		}
	})
	
})

bot.on("messageReactionRemove", async (react, user) => {
	a = recent.findIndex(x => x.message == react.message.id)
	if(!recent[a]) return
	if(user.id == recent[a].user) {
		emb = new discord.MessageEmbed()
			.setTitle("Ghost reaction caught")
			.addField("User", resolveUserFromId(recent[a].user))
			.addField("Emote", recent[a].emoji)
			.addField("Message", `https://discord.com/channels/${recent[a].messageGuild}/${recent[a].messageChannel}/${recent[a].message}`)
			.setTimestamp(recent[a].ts)
			
		con.query(`SELECT * FROM settings WHERE server = '${react.message.guild.id}'`, (err,rows) => {
			if(rows.length == 0) return; 
			bot.channels.fetch(rows[0].channel).then(c => c.send(emb))
		})
	}
})


bot.login(cfg.token); //log in with the token