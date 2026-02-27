# Nginx Fullstack Web Server

## Setup

Git clone this repo to your server's home directory.
```bash
git clone https://github.com/2Kelvin/nginx-web-server.git
```

### Nginx Setup

- Navigate into the repo directory and then into the website folder.
    ```bash
    cd nginx-web-server/website
    ```

- Give `nginx-install` excutable permission, if not given already.
    ```bash
    chmod +x nginx-install
    ```

- Run `nginx-install` to install and setup nginx and ufw.
    ```bash
    ./nginx-install
    ```

    Just a quick note: before installing nginx the script updates apt and upgrade the system first to fetch the latest versions of all installed packages for better compatibility with nginx and avoiding bugs and security issues.
    
    ### Explanation on the firewall configuration (`ufw`)

    - Checking the status of the firewall; which ports are open and which ports are not:
        ```bash
        sudo ufw status
        ```

    - Allowing essential web server & ssh ports past the firewall: `ssh`:`port 22`, `http`:`port 80` & `https`: `port 443`
        ```bash
        sudo ufw allow ssh
        sudo ufw allow http
        sudo ufw allow https

        # activating ufw with all the above firewall rules
        sudo ufw enable

        # checking our enabled ports
        sudo ufw status
        ```


### Website Setup

For demonstration, I'm using a fullstack app running React in the frontend and Expressjs in the backend. To use this same website, install the prerequisites: `nodejs` and `npm` in your ubuntu server.

- Install nodejs and npm.
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y nodejs npm
    ```

- Navigate to the backend folder and initialize `package.json` and install the necessary packages: `express` and `cors`.
    ```bash
    cd nginx-web-server # navigating inside backend folder

    npm init # initializing package.json
    npm install experess cors # installing packages
    ```
