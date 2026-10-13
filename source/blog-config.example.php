<?php
// Copy to private/blog-config.php OUTSIDE public_html. Do not upload this file into public_html.
return [
    'dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE_NAME;charset=utf8mb4',
    'db_user' => 'YOUR_DATABASE_USER',
    'db_password' => 'YOUR_DATABASE_PASSWORD',
    'base_url' => 'https://ahmadalabbas.com',
    'app_key' => 'REPLACE_WITH_A_RANDOM_VALUE_OF_AT_LEAST_32_CHARACTERS',
    'setup_token' => 'REPLACE_WITH_ANOTHER_RANDOM_VALUE_OF_AT_LEAST_32_CHARACTERS',
];
