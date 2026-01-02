import sqlite3
import os
from flask import Flask, g

# Initi flask
app = Flask(__name__)
app.config['DATABASE'] = os.path.join(app.instance_path, 'habits.db')

# Ensure the instance folder exists
try:
    os.makedirs(app.instance_path)
except OSError:
    pass

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    # Init db with schema
    db = get_db()

    # Enable foreign key support
    db.execute('PRAGMA foreign_keys = ON')

    # Create table: habits
    db.execute('''
            CREATE TABLE IF NOT EXISTS habits (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               name TEXT NOT NULL,
               type TEXT NOT NULL,
               target REAL NOT NULL,
               unit TEXT,
               color TEXT
        )
    ''')

    # Create table: daily_logs
    db.execute('''
            CREATE TABLE IF NOT EXISTS daily_logs (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               habit_id INTEGER NOT NULL,
               date DATE NOT NULL,
               value REAL NOT NULL,
               FOREIGN KEY (habit_id) REFERENCES habits (id)
        )
    ''')

    db.commit()
    print("Habit Tracker 9000: Database initialized.")

@app.cli.command('init-db')
def init_db_command():
    init_db()

@app.route('/')
def index():
    return "Habit Tracker 9000 is running!"

if __name__ == '__main__':
    app.run(debug=True)