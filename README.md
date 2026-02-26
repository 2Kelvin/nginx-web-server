# Nginx Web Server

## Setup

1. Git clone this repo to your server's home directory
    ```bash
    git clone https://github.com/2Kelvin/nginx-web-server.git
    ```

2. Navigate into the repo directory and then into the website folder
    ```bash
    cd nginx-web-server/website
    ```

3. Create the necessary website directories (in `/var` dir).
    ```bash
    sudo mkdir -p /var/www/{html,images}
    ```

4. Move the website files to their respective directories.
    ```bash
    sudo mv {index.html,styles.css} /var/www/html
    ```

    and

    ```bash
    sudo mv images/* /var/www/images
    ```

5. Confirm that the web files are in the right contents like so:
    ```bash
    ls /var/www/{html,images}
    ```

5. Navigate out of the website folder.
```bash
cd ..
```

## Installation

Run the `nginx` script in nginx-web-server.
```bash
./nginx
```