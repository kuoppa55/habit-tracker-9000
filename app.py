import json
import sqlite3
import os
import calendar
from flask import Flask, g, render_template, request, redirect, url_for
from datetime import date, timedelta, datetime

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



def calculate_habit_stats(habit, ref_date=None):
    if ref_date is None:
        ref_date = date.today()

    # Calculate current streak and today's status for a given habit
    db = get_db()

    # Fetch all logs for the habit, ordered by date descending
    logs = db.execute(
        'SELECT date, value FROM daily_logs WHERE habit_id = ? ORDER BY date DESC',
        (habit['id'],)
    ).fetchall()

    # Convert logs to a dictionary for easy access
    log_dict = {row['date']: row['value'] for row in logs}

    # Check today's status first
    current_str = ref_date.strftime('%Y-%m-%d')
    current_value = log_dict.get(current_str, 0)

    # Determine if today is done -- for vices this will differ later on
    is_completed = current_value >= habit['target']

    # Calculate historical streak
    streak = 0
    check_date = ref_date - timedelta(days=1)

    while True:
        d_str = check_date.strftime('%Y-%m-%d')
        val = log_dict.get(d_str, 0)

        if val >= habit['target']:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    if is_completed:
        streak += 1

    if habit['target'] > 0:
        fill_percent = min(100, (current_value/ habit['target']) * 100)
    else:
        fill_percent = 0 if current_value == 0 else 100

    shield_material = "wood"
    if streak >= 60:
        shield_material = "energy"
    elif streak >= 30:
        shield_material = "gold"
    elif streak >= 14:
        shield_material = "iron"

    return {
        'streak': streak,
        'fill_percent': fill_percent,
        'is_completed': is_completed,
        'today_value': current_value,
        'shield_material': shield_material
    }

def get_habit_history(habit_id, target, ref_date=None):
    if ref_date is None:
        ref_date = date.today()
    db = get_db()
    history = []

    for i in range(4, -1, -1):
        d = ref_date - timedelta(days=i)
        d_str = d.strftime('%Y-%m-%d')

        row = db.execute(
            'SELECT value FROM daily_logs WHERE habit_id = ? AND date = ?',
            (habit_id, d_str)
        ).fetchone()

        val = row['value'] if row else 0
        completed = val >= target

        if target > 0:
            fill_percent = min(100, (val / target) * 100)
        else:
            fill_percent = 100 if val > 0 else 0

        history.append({
            'date': d.strftime('%a'),
            'full_date': d_str,
            'completed': completed,
            'is_today': (d == ref_date),
            'fill_percent': fill_percent,
        })

    return history

@app.cli.command('init-db')
def init_db_command():
    init_db()

@app.route('/')
def index():
    db = get_db()

    date_str = request.args.get('date')
    if date_str:
        try:
            view_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            view_date = date.today()
    else:
        view_date = date.today()
    habits_query = db.execute('SELECT * FROM habits').fetchall()

    habits_data = []
    for habit in habits_query:
        stats = calculate_habit_stats(habit, ref_date=view_date)
        history = get_habit_history(habit['id'], habit['target'], ref_date=view_date)
        habits_data.append({**habit, **stats, 'history': history})

    return render_template('index.html', habits=habits_data, current_view_date=view_date)

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
    
    log_date_str = request.form.get('date')
    if not log_date_str:
        log_date_str = date.today().strftime('%Y-%m-%d')

    try:
        amount = float(request.form.get('amount'))
    except (ValueError, TypeError):
        amount = 1.0

    existing_log = db.execute(
        'SELECT * FROM daily_logs WHERE habit_id = ? AND date = ?',
        (habit_id, log_date_str)
    ).fetchone()

    if existing_log:
        new_value = existing_log['value'] + amount
        db.execute(
            'UPDATE daily_logs SET value = ? WHERE id = ?',
            (new_value, existing_log['id'])
        )
    else:
        new_value = amount
        db.execute(
            'INSERT INTO daily_logs (habit_id, date, value) VALUES (?, ?, ?)',
            (habit_id, log_date_str, amount)
        )

    habit = db.execute('SELECT * FROM habits WHERE id = ?', (habit_id,)).fetchone()
    event_type = None
    if habit['type'] == 'vice':
        event_type = 'deflected'
    elif new_value >= habit['target']:
        event_type = 'completed'
    
    db.commit()
    return redirect(url_for('index', date=log_date_str, event=event_type, event_id=habit_id))

@app.route('/habit/<int:habit_id>')
def habit_details(habit_id):
    db = get_db()
    habit = db.execute('SELECT * FROM habits WHERE id = ?', (habit_id,)).fetchone()

    all_logs = db.execute(
        'SELECT date, value FROM daily_logs WHERE habit_id = ?',
        (habit_id,)
    ).fetchall()

    log_map = {row['date']: row['value'] for row in all_logs}

    today = date.today()
    target = habit['target']
    is_binary = habit['type'] in ['binary', 'vice']

    # WEEK VIEW
    start_week = today - timedelta(days=today.weekday())
    week_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    week_values = []
    week_total = 0

    for i in range(7):
        day = start_week + timedelta(days=i)
        val = log_map.get(day.strftime('%Y-%m-%d'), 0)

        graph_val = 1 if (is_binary and val >= target) else (val if not is_binary else 0)
        week_values.append(graph_val)

        if is_binary:
            if val >= target: week_total += 1
        else:
            week_total += val

    # MONTH VIEW

    start_month = today.replace(day=1)

    _, days_in_month = calendar.monthrange(today.year, today.month)

    month_labels = [str(i) for i in range(1, days_in_month + 1)]
    month_values = []
    month_total = 0

    for i in range(1, days_in_month + 1):
        day = today.replace(day=i)
        val = log_map.get(day.strftime('%Y-%m-%d'), 0)
        
        graph_val = 1 if (is_binary and val >= target) else (val if not is_binary else 0)
        month_values.append(graph_val)
        
        if is_binary:
            if val >= target: month_total += 1
        else:
            month_total += val

    # YEAR VIEW

    year_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    year_values = []
    year_total = 0

    current_year = today.year

    for month_idx in range(1, 13):
        monthly_sum = 0
        _, d_in_m = calendar.monthrange(current_year, month_idx)

        for d in range(1, d_in_m + 1):
            day_str = f"{current_year}-{month_idx:02d}-{d:02d}"
            val = log_map.get(day_str, 0)

            if is_binary:
                if val >= target:
                    monthly_sum += 1
            else:
                monthly_sum += val
        
        year_values.append(monthly_sum)
        year_total += monthly_sum

    chart_data = {
        'week': {
            'labels': week_labels,
            'values': week_values,
            'total': week_total
        },
        'month': {
            'labels': month_labels,
            'values': month_values,
            'total': month_total
        },
        'year': {
            'labels': year_labels,
            'values': year_values,
            'total': year_total
        }
    }

    return render_template('habit_details.html', habit=habit, chart_data=json.dumps(chart_data))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)