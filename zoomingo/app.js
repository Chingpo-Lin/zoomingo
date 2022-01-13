/*
 * Name: Chingpo Lin
 * Date: Dec 11, 2020
 * Section: CSE 154 AI
 * TA: Tara Wueger
 * This is the node javascript file: app.js, for some functionality of server
 * It is a zoomingo API, and regulate zoomingo information with database.
 * It providing four endpoints to let client start a new game, select a card, win the game,
 * and resume a game. It update and get information from database to use in game process.
 */

"use strict";
const multer = require("multer");
const express = require("express");
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json()); // for application/json
app.use(multer().none());

const DB_NAME = 'zoomingo.db';
const SERVER_ERROR_CODE = 500;
const CLIENT_ERROR_CODE = 400;
const PORTNUM = 8000;

/**
 * get the number of the board size's scenarios from database. Create the game related
 * information and give it to client to have game started.
 */
app.get("/newGame", async function(req, res) {
  let name = req.query["name"];
  let size = req.query["size"];
  if (name.trim() === "") {
    res.type("text").status(CLIENT_ERROR_CODE)
      .send("name cannot be empty");
  }
  if (size === "0") {
    res.type("text").status(CLIENT_ERROR_CODE)
      .send("size cannot be empty");
  }
  try {
    let newBoard = await create(name, size);
    res.json(newBoard);
  } catch (err) {
    res.type("text").status(SERVER_ERROR_CODE)
      .send("Something go wrong");
  }
});

/**
 * updating the game in database when a scenario was selected
 */
app.post("/selectScenarios", async function(req, res) {
  let gid = req.body["game_id"];
  let sid = req.body["scenario_id"];
  try {
    let db = await getDBConnection();
    let gameSql = 'SELECT given_scenario_ids, selected_scenario_ids ' +
        'FROM game_state WHERE game_id=$gid;';
    let game = await db.all(gameSql, {$gid: parseInt(gid)});
    let given = JSON.parse(game[0].given_scenario_ids);
    let selected = game[0].selected_scenario_ids;
    if (selected.length === 0) {
      selected = [];
    } else {
      selected = JSON.parse(game[0].selected_scenario_ids);
    }
    let updateResult = await updateStatus(parseInt(gid), parseInt(sid), given, selected);
    if (updateResult.length === 0) {
      let errorMessage = {'error': 'Could not select scenario ID: ' + sid};
      res.status(CLIENT_ERROR_CODE).json(errorMessage);
    } else {
      res.json({"game_id": updateResult[0], "scenario_id": updateResult[1]});
    }
  } catch (err) {
    res.type("text").status(SERVER_ERROR_CODE)
      .send("Something go wrong");
  }
});

/**
 * check if a game was ended, and send back the result.
 */
app.post("/bingo", async function(req, res) {
  let db = await getDBConnection();
  try {
    let gid = req.body["game_id"];
    let gameSql = 'SELECT * FROM game_state WHERE game_id=$gid;';
    let game = await db.all(gameSql, {$gid: parseInt(gid)});
    let given = JSON.parse(game[0].given_scenario_ids);
    let selected = JSON.parse(game[0].selected_scenario_ids);
    let winResult = await checkWin(parseInt(gid), given, selected);
    if (winResult.length === 0) {
      let errorMessage = {"error": "Game has already been won."};
      res.status(CLIENT_ERROR_CODE).json(errorMessage);
    } else {
      let jsonResult = {"game_id": winResult[0], "winner": winResult[1]};
      res.json(jsonResult);
    }
  } catch (err) {
    res.type("text").status(SERVER_ERROR_CODE)
      .send("Something go wrong");
  }
});

/**
 * get the information of a given game, and send all information of that game
 * in order to resume it.
 */
app.get("/resumeGame", async function(req, res) {
  let db = await getDBConnection();
  try {
    let gid = parseInt(req.query["game_id"]);
    let pid = parseInt(req.query["player_id"]);
    let gameSql = 'SELECT * FROM game_state WHERE game_id=$gid';
    let state = await db.all(gameSql, {$gid: gid});
    let given = JSON.parse(state[0].given_scenario_ids);
    let selected = JSON.parse(state[0].selected_scenario_ids);
    let resumeResult = await resume(gid, pid, given, selected);
    if (resumeResult.length === 0) {
      let errorMessage = {
        "error": "Cannot resume game: Player " + pid +
            " was not part of game " + gid
      };
      res.status(CLIENT_ERROR_CODE).json(errorMessage);
    } else {
      res.json(resumeResult);
    }
  } catch (err) {
    res.type("text").status(SERVER_ERROR_CODE)
      .send("Something go wrong");
  }
});

/**
 * called in resume a game, create the board corresponding to the given game
 * @param {int} gid the game id
 * @param {int} pid the player id
 * @param {Array} given all scenarios in the game
 * @param {Array} selected all selected scenarios in the game
 * @returns {JSON} returns the game information in json format
 */
async function resume(gid, pid, given, selected) {
  let selectPlayer = "SELECT * FROM players WHERE id=$pid";
  let db = await getDBConnection();
  let player = await db.all(selectPlayer, {$pid: pid});
  if (player.length === 0) {
    return [];
  }
  let resumeBoard = [];
  for (let i = 0; i < given.length; i++) {
    let selectCard = "SELECT * FROM scenarios WHERE id=$sid";
    let card = await db.all(selectCard, {$sid: given[i]});
    resumeBoard.push(card[0]);
  }
  player[0]['board'] = resumeBoard;
  player[0]['selected_scenarios'] = selected;
  let game = {"game_id": parseInt(gid)};
  game['player'] = player[0];
  return game;
}

/**
 * check if the game has a winner
 * @param {int} gid the game id
 * @param {Array} given all scenarios in the board
 * @param {Array} selected all selected scenarios in the board
 * @returns {Array} returns an array with game id and player id
 */
async function checkWin(gid, given, selected) {
  let db = await getDBConnection();
  let selectWin = "SELECT winner FROM games WHERE id=$gid";
  let win = await db.all(selectWin, {$gid: gid});
  if (win[0].winner !== '') {
    return [];
  }
  let winner = null;
  if (selected.length >= Math.sqrt(given.length)) {
    let selectPlayer = 'SELECT player_id FROM game_state WHERE game_id=$gid';
    let updateWin = 'UPDATE games SET winner=$pid WHERE id=$gid';
    let selectName = 'SELECT name FROM players WHERE id=$pid';
    let stateSql = await db.all(selectPlayer, {$gid: gid});
    await db.run(updateWin, {$pid: parseInt(stateSql[0].pid), $gid: gid});
    let names = await db.all(selectName, {$pid: parseInt(stateSql[0].player_id)});
    winner = names[0].name;
  }
  return [gid, winner];
}

/**
 * update the game in database by adding the selected scenarios.
 * @param {int} gid the id of game
 * @param {int} sid the id of a selected scenario
 * @param {Array} given all scenarios' id in the game
 * @param {Array} selected all selected scenarios
 * @returns {Array} returns the array with both game id and selected scenarios' id
 */
async function updateStatus(gid, sid, given, selected) {
  let db = await getDBConnection();
  if (selected.indexOf(sid) !== -1) {
    return [gid, sid];
  }
  if (given.indexOf(sid) === -1) {
    return [];
  }
  selected.push(sid);
  selected = JSON.stringify(selected);
  let update = 'UPDATE game_state SET selected_scenario_ids=$selected WHERE game_id=$gid';
  await db.run(update, {$selected: selected, $gid: gid});
  return [gid, sid];
}

/**
 * create the new game, add or get a existed player, and create a new board for the game
 * @param {String} name the name of player
 * @param {String} size the size of board
 * @returns {JSON} returns the Json object including all information in the game
 */
async function create(name, size) {
  let db = await getDBConnection();
  let scenario = await db.all('SELECT * FROM scenarios');
  if (parseInt(size) > scenario.length) {
    return {"error": "there is not enough scenarios"};
  }
  let existSql = "SELECT * FROM players WHERE name=$name";
  let find = await db.all(existSql, {$name: name});
  let pid;
  if (find.length === 0) {
    let insert = 'INSERT INTO players (name) VALUES ($name);';
    let result2 = await db.run(insert, {$name: name});
    pid = result2.lastID;
  } else {
    pid = find[0].id;
  }
  let newBoard = await board(parseInt(size), scenario);
  let result = await db.run("INSERT INTO games (winner) VALUES ('')");
  let choosePlayer = await db.all("SELECT * FROM players WHERE id=$pid", {$pid: pid});
  let returnResult = {"game_id": result.lastID, "player": choosePlayer[0]};
  (returnResult["player"])["board"] = newBoard;
  let bid = pushBoard(newBoard);
  let insert = "INSERT INTO game_state (game_id, player_id, given_scenario_ids) " +
    "VALUES ($gid, $pid, $bid)";
  await db.run(insert, [result.lastID, pid, JSON.stringify(bid)]);
  await db.close();
  return returnResult;
}

/**
 * add board's id to an array
 * @param {Array} newBoard the random generate board with all info of the board
 * @returns {Array} the array with ids
 */
function pushBoard(newBoard) {
  let bid = [];
  for (let i = 0; i < newBoard.length; i++) {
    bid.push(newBoard[i].id);
  }
  return bid;
}

/**
 * create the new board containing different id of scenarios, returns the array result
 * @param {int} size the size of board
 * @param {Array} scenario the list of all scenarios
 * @returns {Array} returns the array contains all board scenarios or just empty when error
 */
function board(size, scenario) {
  let indexSet = [];
  while (indexSet.length < size) {
    let num = Math.floor(Math.random() * scenario.length);
    if (indexSet.length === Math.floor(size / 2)) {
      indexSet.push(0);
    } else if (num !== 0 && indexSet.indexOf(num) === -1) {
      indexSet.push(num);
    }
  }
  let textBoard = [];
  for (let i = 0; i < indexSet.length; i++) {
    textBoard.push(scenario[indexSet[i]]);
  }
  return textBoard;
}

/**
 * Initializes a database connection, returning a handle on it.
 * @returns {Object} a SQLite database object.
 */
async function getDBConnection() {
  let db = await sqlite.open({
    filename: DB_NAME,
    driver: sqlite3.Database
  });
  return db;
}

app.use(express.static('public'));
const PORT = process.env.PORT || PORTNUM;
app.listen(PORT);