#!/bin/bash

# Ambieye Backend PHP - Setup Script
# This script helps you set up the PHP backend with MySQL

set -e  # Exit on error

echo "========================================="
echo "Ambieye Backend PHP - Setup Script"
echo "========================================="
echo ""

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo "❌ PHP is not installed. Please install PHP 7.4 or higher."
    exit 1
fi

echo "✓ PHP version: $(php -v | head -n 1)"

# Check if Composer is installed
if ! command -v composer &> /dev/null; then
    echo "❌ Composer is not installed. Please install Composer first."
    echo "   Visit: https://getcomposer.org/download/"
    exit 1
fi

echo "✓ Composer is installed"

# Check if MySQL/MariaDB is available
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL/MariaDB client not found. You'll need to manually import the database schema."
else
    echo "✓ MySQL client found"
fi

echo ""
echo "Installing dependencies..."
composer install --no-dev

echo ""
echo "========================================="
echo "✓ Installation Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Create the database:"
echo "   mysql -u root -p < database_schema.sql"
echo ""
echo "2. Configure environment:"
echo "   Edit .env file with your database credentials"
echo ""
echo "3. Run the server (Development):"
echo "   php -S localhost:5000 -t public/"
echo ""
echo "4. Or configure your Apache/Nginx server"
echo "   - Apache: Ensure mod_rewrite is enabled"
echo "   - Nginx: Use location rule to route to index.php"
echo ""
echo "For more information, see README.md"
echo ""
