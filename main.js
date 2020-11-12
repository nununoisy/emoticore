const discord = require("discord.js")
const mysql = require('mysql');
const cfg = require("./config.json")
const bot = new discord.Client({disableEveryone: true})
var con = mysql.createConnection({
  host: cfg.sql.host,
  user: cfg.sql.user,
  password: cfg.sql.password,
  database: cfg.sql.database
});
prefix = cfg.prefix

lastcommand = Date.now()
timeout = cfg.timeout

con.connect(err => {if(err) throw err; console.log("Connected to database")})

bot.on("ready", async () => {
	
		console.log("Ready")
		let link = await bot.generateInvite(["SEND_MESSAGES"])
		console.log(link)
		
})

//setInterval(() => {cleanupDuplicates("test", "x")},5000)

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

/////////////////////////////////
//THE FUNCTION BELOW IS UNUSED //
//      IT DOES NOT WORK       //
/////////////////////////////////

function cleanupDuplicates(table, value) {
	list = []
	rowsDeleted = 0
	con.query(`SELECT * FROM ${table}`, (err,rows) => {
			if(err) throw err
			for(i=0;i<rows.length;i++) {
				if(!list.includes(rows[i][value])) list.push(rows[i][value])
			} //Build list of rows
			
			for(let i=0;i<list.length;i++) {
				con.query(`SELECT * FROM ${table} WHERE ${value} = '${list[i]}'`, (err,otherrows) => {
					console.log(otherrows[1])
					if(otherrows[1]) {
						sql = `DELETE FROM ${table} WHERE ${value} = '${list[i]}' LIMIT ${otherrows.filter(x => x == otherrows[i]).length-1}`
						console.log(sql)
						//con.query(`DELETE FROM ${table} WHERE ${value} = '${list[i]}' LIMIT ${list.filter(x => x = list[i]).length-1}`)
						rowsDeleted++
					}
				})
			} //Sweep through the list and delete duplicates
	})
	console.log(`Cleanup finished, deleted ${rowsDeleted} duplicates`)
}

bot.on("message", message => {
	msgArray = message.content.split(" ")
	
	for(i=0;i<msgArray.length;i++) {
		if(msgArray[i].startsWith("<:")||msgArray[i].startsWith("<a:") && msgArray[i].endsWith(">")) {
			if(msgArray[i].includes("'")||msgArray[i].includes(";")) return
			id = msgArray[i].slice(-19,-1)
			
			con.query(`SELECT * FROM emotes WHERE id = '${id}'`, (err,rows) => {
				if(err) throw err
				if(rows.length < 1) {
					con.query(`INSERT INTO emotes (id, uses, messages, reacts) VALUES ('${id}', 1, 1, 0)`)
				} else {
					con.query(`UPDATE emotes SET uses = ${rows[0].uses+1} WHERE id = '${id}'`)
					con.query(`UPDATE emotes SET messages = ${rows[0].messages+1} WHERE id = '${id}'`)
				}
			})
		}
	}
	
	if(message.content.startsWith(prefix + "uses")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
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
		
		con.query(`SELECT * FROM emotes WHERE id = '${id}'`, (err,rows) => {
			if(!rows[0]) return message.reply("I haven't logged that emote yet.")
			message.reply(`${resolveEmoteTagFromId(id)} has been used ${rows[0].uses} times. (${rows[0].messages} times in messages, ${rows[0].reacts} times as a reaction)`)
		})
		return
	}
	
	if(message.content.startsWith(prefix + "stats")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		target = message.mentions.users.first()||message.author
		
		con.query(`SELECT * FROM users WHERE id = '${target.id}'`, (err,rows) => {
			if(!rows[0]) return message.reply("I haven't logged that user yet.")
			 message.reply(`${bot.users.cache.get(target.id).tag} has received ${rows[0].rrecv} reactions and sent ${rows[0].rsent} reactions`)
		})
		return
	}
	
	if(message.content.startsWith(prefix + "help")) {
		message.reply("++uses [emote] to get info about an emote, ++stats [user, leave blank for yourself] to get info about a user, ++leaderboard to check leaderboards, ++random to get a random emote or ++user for a random user")
	}
	
	if(message.content.startsWith(prefix + "leaderboard")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		if(!msgArray[1]) return message.reply("Which leaderboard would you like to see?\nmost-used - most used emotes\nmost-reacts-sent - most reactions sent\nmost-reacts-received - most reactions received\ntype `++leaderboard [your choice]`")
		
		if(msgArray[1] == "most-used") {
		con.query(`SELECT * FROM emotes`, (err,rows) => {
			sorted = rows.sort(function(a, b) {return a.uses - b.uses})
			sorted.reverse()
			emb = new discord.MessageEmbed()
				.setTitle("Leaderboard | Most used emotes")
				.setDescription(`1. ${resolveEmoteTagFromId(sorted[0].id)} | ${sorted[0].uses}\n2. ${resolveEmoteTagFromId(sorted[1].id)} | ${sorted[1].uses}\n3. ${resolveEmoteTagFromId(sorted[2].id)} | ${sorted[2].uses}\n4. ${resolveEmoteTagFromId(sorted[3].id)} | ${sorted[3].uses}\n5. ${resolveEmoteTagFromId(sorted[4].id)} | ${sorted[4].uses}`)
			return message.reply(emb)
		}) //this could be cleaner
		}
		
		if(msgArray[1] == "most-reacts-sent") {
		con.query(`SELECT * FROM users`, (err,rows) => {
			sorted = rows.sort(function(a, b) {return a.rsent - b.rsent})
			sorted.reverse()
			emb = new discord.MessageEmbed()
				.setTitle("Leaderboard | Most reactions sent")
				.setDescription(`1. ${resolveUserFromId(sorted[0].id)} | ${sorted[0].rsent}\n2. ${resolveUserFromId(sorted[1].id)} | ${sorted[1].rsent}\n3. ${resolveUserFromId(sorted[2].id)} | ${sorted[2].rsent}\n4. ${resolveUserFromId(sorted[3].id)} | ${sorted[3].rsent}\n5. ${resolveUserFromId(sorted[4].id)} | ${sorted[4].rsent}`)
			return message.reply(emb)
		})
		}
		
		if(msgArray[1] == "most-reacts-received") {
		con.query(`SELECT * FROM users`, (err,rows) => {
			sorted = rows.sort(function(a, b) {return a.rrecv - b.rrecv})
			sorted.reverse()
			emb = new discord.MessageEmbed()
				.setTitle("Leaderboard | Most reactions received")
				.setDescription(`1. ${resolveUserFromId(sorted[0].id)} | ${sorted[0].rrecv}\n2. ${resolveUserFromId(sorted[1].id)} | ${sorted[1].rrecv}\n3. ${resolveUserFromId(sorted[2].id)} | ${sorted[2].rrecv}\n4. ${resolveUserFromId(sorted[3].id)} | ${sorted[3].rrecv}\n5. ${resolveUserFromId(sorted[4].id)} | ${sorted[4].rrecv}`)
			message.reply(emb)
		})
		}
		return
	}
	
	if(message.content.startsWith(prefix + "random")) {
		if(Date.now() < lastcommand + timeout) return message.reply("You're using this command a bit too fast, calm down.")
		lastcommand = Date.now()
		con.query(`SELECT * FROM emotes`, (err,rows) => {
			newrows = []
			for(i=0;i<rows.length;i++) {
				if(bot.emojis.cache.filter(x => x.id == rows[i].id).first()) newrows.push(rows[i])
			} //clean up emotes that the bot can't use
			row = newrows[Math.round(Math.random()*newrows.length)]||newrows[0]
			
			message.reply(`${resolveEmoteTagFromId(row.id)} has been used ${row.uses} times. (${row.messages} times in messages, ${row.reacts} times as a reaction)`)
		})
		return
	}
	
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
})

bot.on("messageReactionAdd", react => {
	console.log(`${react.users.cache.last().tag} reacted with ${react.emoji.name} to ${react.message.author.tag}`)
	if(!react.emoji.id) return
	
	
	con.query(`SELECT * FROM emotes WHERE id = '${react.emoji.id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT INTO emotes (id, uses, messages, reacts) VALUES ('${react.emoji.id}', 1, 0, 1)`)
		} else {
			con.query(`UPDATE emotes SET uses = ${rows[0].uses+1} WHERE id = '${react.emoji.id}' LIMIT 1`)
			con.query(`UPDATE emotes SET reacts = ${rows[0].reacts+1} WHERE id = '${react.emoji.id}' LIMIT 1`)
		}
	})
	
	con.query(`SELECT * FROM users WHERE id = '${react.message.author.id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT INTO users (id, rrecv, rsent) VALUES ('${react.message.author.id}', 1, 0)`)
		} else {
			con.query(`UPDATE users SET rrecv = ${rows[0].rrecv+1} WHERE id = '${react.message.author.id}'`)
		}
	})
	
	con.query(`SELECT * FROM users WHERE id = '${react.users.cache.last().id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT INTO users (id, rrecv, rsent) VALUES ('${react.users.cache.last().id}', 0, 1)`)
		} else {
			if(!react.users.cache.last()) return
			con.query(`UPDATE users SET rsent = ${rows[0].rsent+1} WHERE id = '${react.users.cache.last().id}'`)
		}
	})
	
})


bot.login(cfg.token); //log in with the token
