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

con.connect(err => {if(err) throw err; console.log("Connected to database")})

bot.on("ready", async () => {
	
		console.log("Ready")
		let link = await bot.generateInvite(["SEND_MESSAGES"])
		console.log(link)
		
})



bot.on("message", async message => {
	msgArray = message.content.split(" ")
	
	for(i=0;i<msgArray.length;i++) {
		if(msgArray[i].startsWith("<:") && msgArray[i].endsWith(">")) {
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
		if(!msgArray[1]) return
		
		if(msgArray[1].startsWith("<:") && msgArray[1].endsWith(">")) {
			id = msgArray[1].slice(-19,-1)
			
			if(!id) return
			if(isNaN(id)) return
			if(!bot.emojis.cache.filter(x => x.id == id)) return
		} else return
		
		con.query(`SELECT * FROM emotes WHERE id = '${id}'`, (err,rows) => {
			if(!rows[0]) return
			message.reply(`<:${bot.emojis.cache.filter(x => x.id == id).first().name}:${id}> has been used ${rows[0].uses} times. (${rows[0].messages} times in messages, ${rows[0].reacts} times as a reaction)`)
		})
	}
	
	if(message.content.startsWith(prefix + "stats")) {
		target = message.mentions.users.first()||message.author
		
		con.query(`SELECT * FROM users WHERE id = '${target.id}'`, (err,rows) => {
			if(!rows[0]) return
			message.reply(`${bot.users.cache.get(target.id).tag} has received ${rows[0].rrecv} reactions and sent ${rows[0].rsent} reactions`)
		})
	}
	
	if(message.content.startsWith(prefix + "help")) {
		message.reply("++uses [emote] to get info about an emote, ++stats [user, leave blank for yourself] to get info about a user")
	}
	
	if(message.content.startsWith(prefix + "invite")) {
		let link = await bot.generateInvite(["SEND_MESSAGES"])
		message.reply(link)
	}
})

bot.on("messageReactionAdd", async react => {
	
	con.query(`SELECT * FROM emotes WHERE id = '${react.emoji.id}'`, (err,rows) => {
		if(err) throw err
		if(rows.length < 1) {
			con.query(`INSERT INTO emotes (id, uses, messages, reacts) VALUES ('${react.emoji.id}', 1, 0, 1)`)
		} else {
			con.query(`UPDATE emotes SET uses = ${rows[0].uses+1} WHERE id = '${react.emoji.id}'`)
			con.query(`UPDATE emotes SET reacts = ${rows[0].reacts+1} WHERE id = '${react.emoji.id}'`)
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
			con.query(`UPDATE users SET rsent = ${rows[0].rsent+1} WHERE id = '${react.users.cache.last().id}'`)
		}
	})
	
})


bot.login(cfg.token); //log in with the token