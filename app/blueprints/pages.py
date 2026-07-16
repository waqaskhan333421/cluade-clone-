from flask import Blueprint, render_template

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
def index():
    """
    Renders the main Claude clone index page.
    """
    return render_template('index.html')
