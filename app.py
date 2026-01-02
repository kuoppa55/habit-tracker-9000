import sqlite3
import os
from flask import Flask, g, render_template, request, redirect, url_for
from datetime import date, timedelta

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



def calculate_habit_stats(habit):
    # Calculate current streak and today's status for a given habit
    db = get_db()

    # Fetch all logs for the habit, ordered by date descending
    logs = db.execute(
        'SELECT date, value FROM daily_logs WHERE habit_id = ? ORDER BY date DESC',
        (habit['id'],)
    ).fetchall()

    # Convert logs to a dictionary for easy access
    log_dict = {row['date']: row['value'] for row in logs}

    # Calculate current streak
    streak = 0
    check_date = date.today()

    # If today is not completed that does not count for breaking the streak

    current_check = date.today() - timedelta(days=1)

    while True:
        d_str = current_check.strftime('%Y-%m-%d')
        val = log_dict.get(d_str, 0)

        if val >= habit['target']:
            streak += 1
            current_check -= timedelta(days=1)
        else:
            break

    # Get today's ring percentage
    today_str = date.today().strftime('%Y-%m-%d')
    today_value = log_dict.get(today_str, 0)

    fill_percent = min(100, (today_value / habit['target']) * 100)

    is_completed = today_value >= habit['target']

    return {
        'streak': streak,
        'fill_percent': fill_percent,
        'is_completed': is_completed,
        'today_value': today_value
    }

@app.cli.command('init-db')
def init_db_command():
    init_db()

@app.route('/')
def index():
    db = get_db()
    habits_query = db.execute('SELECT * FROM habits WHERE type != "vice"').fetchall()

    habits_data = []
    for habit in habits_query:
        stats = calculate_habit_stats(habit)
        habits_data.append({**habit, **stats})

    return render_template('index.html', habits=habits_data)

@app.route('/add', methods=('GET', 'POST'))
def add_habit():
    if request.method == 'POST':
        name = request.form['name']
        h_type = request.form['type']

        try:
            target = float(request.form['target'])
        except ValueError:
            target = 1.0
        
        unit = request.form.get('unit', '')
        color = request.form['color']

        db = get_db()
        db.execute(
            'INSERT INTO habits (name, type, target, unit, color) VALUES (?, ?, ?, ?, ?)',
            (name, h_type, target, unit, color)
        )
        db.commit()
        return redirect(url_for('index'))
    return render_template('add_habit.html')

@app.route('/log/<int:habit_id>', methods=['POST'])
def log_progress(habit_id):
    db = get_db()
    today = date.today().strftime('%Y-%m-%d')

    try:
        amount = float(request.form.get('amount'))
    except (ValueError, TypeError):
        amount = 1.0

    existing_log = db.execute(
        'SELECT * FROM daily_logs WHERE habit_id = ? AND date = ?',
        (habit_id, today)
    ).fetchone()

    if existing_log:
        new_value = existing_log['value'] + amount
        db.execute(
            'UPDATE daily_logs SET value = ? WHERE id = ?',
            (new_value, existing_log['id'])
        )
    else:
        db.execute(
            'INSERT INTO daily_logs (habit_id, date, value) VALUES (?, ?, ?)',
            (habit_id, today, amount)
        )
    db.commit()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)