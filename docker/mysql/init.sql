CREATE DATABASE IF NOT EXISTS clicktoeat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS clicktoeat_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON clicktoeat.* TO 'clicktoeat'@'%';
GRANT ALL PRIVILEGES ON clicktoeat_testing.* TO 'clicktoeat'@'%';
FLUSH PRIVILEGES;
