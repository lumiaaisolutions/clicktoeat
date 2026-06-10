FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
        git \
        unzip \
        oniguruma-dev \
        libzip-dev \
        icu-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        mysql-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        bcmath \
        zip \
        intl \
        gd \
        opcache \
        pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY apps/api/composer.json apps/api/composer.lock* ./
RUN composer install --no-interaction --no-scripts --no-autoloader --prefer-dist || true

COPY apps/api/ ./
RUN composer dump-autoload --optimize || true

RUN addgroup -g 1000 www && adduser -D -u 1000 -G www www \
    && chown -R www:www /var/www/html

USER www

EXPOSE 9000
CMD ["php-fpm"]
