# app.js for zoomingo API Documentation
The name API we can get and regulate the process of the game zoomingo

## Initialize the new game
**Request Format:** /newGame

**Request Type:** GET

**Returned Data Format**: Json

**Description:** Returns the game information in an Json format

**Example Request:** /newGame?name=bob&size=9

**Example Response:**
*Fill in example response in the ticks*

```json
{
    "game_id": 132,
    "player": {
        "id": 3,
        "name": "bob",
        "board": [
            {
                "id": 15,
                "text": "Is this too small?"
            },
            {
                "id": 28,
                "text": "I'm lagging"
            },
            {
                "id": 2,
                "text": "I think you're muted"
            },
            {
                "id": 4,
                "text": "You're not looking at the camera"
            },
            {
                "id": 1,
                "text": "FREE"
            },
            {
                "id": 29,
                "text": "Loud background noises"
            },
            {
                "id": 39,
                "text": "like my background?"
            },
            {
                "id": 7,
                "text": "Am I in the right meeting?"
            },
            {
                "id": 33,
                "text": "Outside watching lecture"
            }
        ]
    }
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
a name or size value is missing

## select a card
**Request Format:** /selectScenarios

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Given a scenario id and a game id, update the information in database and return them in 
same format

**Example Request:** /selectScenarios

**Example Response:**

```json
{
    "game_id": 132,
    "scenario_id": 1
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
If passed a scenario id that is not in or board

## end a game
**Request Format:** /bingo

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Given a game id, see if the game has a winner

**Example Request:** /bingo

**Example Response:**

```json
{
    "game_id": 132,
    "winner": "bob"
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
If the game already has a winner

## resume a game get a game information
**Request Format:** /resume

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Given a game id in local, get the information of the game

**Example Request:** /resume?game_id=132&player_id=3

**Example Response:**

```json

    {
    "game_id": 132,
    "player": {
        "id": 3,
        "name": "bob",
        "board": [
            {
                "id": 15,
                "text": "Is this too small?"
            },
            {
                "id": 28,
                "text": "I'm lagging"
            },
            {
                "id": 2,
                "text": "I think you're muted"
            },
            {
                "id": 4,
                "text": "You're not looking at the camera"
            },
            {
                "id": 1,
                "text": "FREE"
            },
            {
                "id": 29,
                "text": "Loud background noises"
            },
            {
                "id": 39,
                "text": "like my background?"
            },
            {
                "id": 7,
                "text": "Am I in the right meeting?"
            },
            {
                "id": 33,
                "text": "Outside watching lecture"
            }
        ],
        "selected_scenarios": [
            1,
            2,
            4
        ]
    }
}

```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
If the player is not belongs to the game


