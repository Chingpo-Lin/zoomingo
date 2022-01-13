/*
 * Name: Chingpo Lin
 * Date: Dec 10, 2020
 * Section: CSE 154 AI
 * TA: Tara Wueger
 * This is the zoomingo javascript file: zoomingo.js, for some functionality of zoomingo
 * It regulate the game information with app.js which is a API file for zoomingo.
 * In this file, we regulate the process of game, and we can start, reset, and resume a game.
 */

"use strict";
(function() {

  window.addEventListener("load", init);
  const TWO_THOUSAND = 2000;
  const NINE = 9;
  const TWO_FIVE = 25;
  const FOUR_NINE = 49;

  /**
   * initialize all button, and loading the initial page with expected information
   */
  function init() {
    id("new-game").addEventListener("click", start);
    id("reset").addEventListener("click", reset);
    id("bingo").addEventListener("click", end);
    id("size-select").addEventListener("change", createBoard);
    let gid = localStorage.getItem("game_id");
    let pid = localStorage.getItem("player_id");
    if (gid !== null && pid !== null && !isNaN(parseInt(gid)) && !isNaN(parseInt(pid))) {
      id("resume").disabled = false;
      id("resume").addEventListener("click", function() {
        resume(gid, pid);
      });
    }
  }

  /**
   * called when we want to resume a game, fetch the API for last game information
   * @param {String} gid the id of the game
   * @param {String} pid the id of the player
   */
  function resume(gid, pid) {
    let url = "resumeGame?game_id=" + gid + "&player_id=" + pid;
    fetch(url)
      .then(checkStatus)
      .then(resp => resp.json())
      .then(game)
      .catch((error) => {
        id("error").textContent = error;
      });
  }

  /**
   * by accepting the information from API, updating the card
   * which is selected
   * @param {JSON} res response form API in Json format contains the information of game
   */
  function game(res) {
    id("name").value = res.player.name;
    id("size-select").value = "" + res.player.board.length;
    id("new-game").disabled = true;
    id("error").textContent = '';
    createBoard();
    fill(res);
    let selected = res.player.selected_scenarios;
    for (let i = 0; i < selected.length; i++) {
      id(selected[i]).classList.add("selected");
    }
  }

  /**
   * called when new game button was clicked, and get the board from
   * API when there is valid input in name and board size
   */
  function start() {
    if (parseInt(id("size-select").value) === 0) {
      id("error").textContent = 'Please select a board size';
    } else if (id("name").value.trim() === "") {
      id("error").textContent = 'Please enter a name';
    } else {
      id("error").textContent = '';
      id("name").disabled = true;
      id("size-select").disabled = true;
      id("new-game").disabled = true;
      let url = '/newGame?name=' + id("name").value + '&size=' + id("size-select").value;
      fetch(url)
        .then(checkStatus)
        .then(resp => resp.json())
        .then(fill)
        .catch((error) => {
          id("error").textContent = error;
        });
    }
  }

  /**
   * reset the game, make everything to origin.
   */
  function reset() {
    id("name").disabled = false;
    id("size-select").disabled = false;
    id("new-game").disabled = false;
    id("new-game").disabled = false;
    qsa("option")[0].selected = true;
    localStorage.removeItem("game_id");
    localStorage.removeItem("player_id");
    qsa("option")[0].selected = true;
    createBoard();
    id("error").textContent = "";
    id("message").textContent = "";
    id("message").classList.add("hidden");
    id("resume").disabled = true;
  }

  /**
   * called when bingo was clicked, fetch the API to see if the game can win
   */
  function end() {
    if (localStorage.getItem("game_id") === null || !id("new-game").disabled) {
      id("error").textContent = "no game found";
    } else {
      let data = new FormData();
      data.append("game_id", localStorage.getItem("game_id"));
      let url = '/bingo';
      fetch(url, {method: "POST", body: data})
        .then(checkStatus)
        .then(resp => resp.json())
        .then(bingo)
        .catch(error => {id("error").textContent = error;});
    }
  }

  /**
   * by interacting with API, knowing if the game can be win, and
   * gives corresponding respond
   * @param {JSON} res the API with game id and winner name (null if no winner)
   */
  function bingo(res) {
    if (res["winner"] === null) {
      id("message").textContent = "nobody won";
      id("message").classList.remove("hidden");
      setTimeout(function() {
        id("message").classList.add("hidden");
      }, TWO_THOUSAND);
    } else {
      id("message").textContent = "good job! you won";
      id("message").classList.remove("hidden");
      id("name").disabled = false;
      id("size-select").disabled = false;
      let card = qsa(".scenario");
      for (let i = 0; i < card.length; i++) {
        card[i].removeEventListener("click", select);
      }
    }
  }

  /**
   * create an empty new board in the size we choose
   */
  function createBoard() {
    let count = parseInt(id("size-select").value);
    let currentChild = id("board").children.length;
    for (let i = 0; i < currentChild; i++) {
      id("board").lastChild.remove();
    }
    let boardSize = checkSize(count);
    for (let i = 0; i < count; i++) {
      let card = gen("div");
      card.classList.add("square");
      card.classList.add(boardSize);
      let text = gen("p");
      text.classList.add("scenario");
      card.appendChild(text);
      id("board").appendChild(card);
    }
  }

  /**
   * select the class name by the size of board to make
   * the board look nicer.
   * @param {int} count the number of text in board
   * @returns {string} return the class name according to the board size.
   */
  function checkSize(count) {
    if (count === NINE) {
      return "three";
    } else if (count === TWO_FIVE) {
      return "five";
    } else if (count === FOUR_NINE) {
      return "seven";
    }
    return "nine";
  }

  /**
   * by accepting what is returned from API, fill the board with given text
   * @param {JSON} res json file containing the game information
   */
  function fill(res) {
    if (res.error !== undefined) {
      throw Error("scenarios is not enough");
    }
    let board = res.player.board;
    localStorage.setItem("game_id", res.game_id);
    localStorage.setItem("player_id", res.player.id);
    let text = qsa(".scenario");
    for (let i = 0; i < text.length; i++) {
      text[i].textContent = board[i].text;
      text[i].id = board[i].id;
      text[i].addEventListener("click", select);
    }
  }

  /**
   * called when we select a scenario, updating by fetch API, and
   * let it no longer be selected again.
   */
  function select() {
    let url = '/selectScenarios';
    this.classList.add("selected");
    let data = new FormData();
    data.append("scenario_id", this.id);
    data.append("game_id", localStorage.getItem("game_id"));
    fetch(url, {method: "POST", body: data})
      .then(checkStatus)
      .then(() => {this.removeEventListener("click", select);})
      .catch((error) => {id("error").textContent = error;});
  }

  /**
   * Check the status
   * @param {Object} res is response from the page.
   * @returns {Promise<{ok}|*|Error>} returns error when error happens,
   * else the response from web
   */
  async function checkStatus(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * generate an element with given tag
   * @param {String } tagName - the name of tag
   * @returns {object} - the DOM element with given tag name
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }

  /**
   * returns the array with all given selector.
   * @param {String} selector - the id of an element.
   * @return {Object} - the array with all given selector
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * returns the object with given id.
   * @param {String} id - the id of an element.
   * @return {Object} - the object with given id
   */
  function id(id) {
    return document.getElementById(id);
  }
})();