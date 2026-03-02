# Nginx Reverse Proxy & Web Server

## Nginx Installation & UFW Setup

Git clone this repo to your server's home directory.
```bash
git clone https://github.com/2Kelvin/nginx-web-server.git
```

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
    
    ### Pointers on firewall configuration (`ufw`)

    - Check the status of the firewall; which ports are open and which ports are not:
        ```bash
        sudo ufw status
        ```

    - Allow essential web server & ssh ports past the firewall: `ssh`:`port 22`, `http`:`port 80` & `https`: `port 443`
        ```bash
        sudo ufw allow ssh
        sudo ufw allow http
        sudo ufw allow https

        # activating ufw with all the above firewall rules
        sudo ufw enable

        # checking enabled ports
        sudo ufw status
        ```


## Nginx Web Server Setup

The demo website is a simple fullstack app about Nginx Facts running `react in the frontend` and `NodeJS in the backend`. Since Nginx excels at serving static sites, I made a build of this website by running `npm run build`. These `build files` is what nginx will serve. Let's set it up:

- Create the website folder in `/var/www/`
    ```bash
    sudo mkdir -p /var/www/nginx-facts-website/html
    ```

- From **demo website/frontend** folder, copy all the `build folder contents` into `/var/www/nginx-facts-website/html` directory created above for our website to be served by Nginx.
    ```bash
    sudo cp -r demo-website/frontend/build/* /var/www/nginx-facts-website/html/
    ```

- Create an nginx configuration file for the website in `/etc/nginx/sites-available/`. We're naming this configuration file `nginx-facts`.
    ```bash
    sudo touch /etc/nginx/sites-available/nginx-facts
    ```

- Copy these configurations into the file:
```bash
    server {
            server_name your_server_ip
            root /var/www/nginx-facts-website/html

            location / {}
    }
```
We're creating a website server block for our website to be served by nginx; we first give nginx our server name (replace this with your server's IP/host name). The server name is the ip or host name the user types in the browser trying to connect and make a request to our server. The root directive tells nginx where our website files lives, so the user requests are served the files in there. **/var/www/nginx-facts-website/html**: This is the folder we created earlier containing the build folder contents of our fullstack app.

- To enable our website to be recognized by nginx, we create a **symbolic link** of our website configuration to the `/etc/nginx/sites-enabled/` folder.
    ```bash
    sudo ln -s /etc/nginx/sites-available/nginx-facts /etc/nginx/sites-enabled/
    ```

- We confirm if our nginx website configuration file has any errors:
    ```bash
    sudo nginx -t
    ```
    If there are any errors, make the necessary changes as directed in the console.

- If our nginx configuration is okay, we **reload nginx** using `systemctl` for our configuration to take effect and for nginx to host our site.
```bash
    sudo systemctl reload nginx 
```

NGINX USE SUMMARY
Step,Action,Command/Location
1. Files,Create a unique folder for the site.,/var/www/yourdomain.com/html
2. Config,Create a named file (not editing default).,/etc/nginx/sites-available/yourdomain.com
3. Identity,Set the server_name and root.,Inside the config file ✍️
4. Enable,Create the symbolic link.,sudo ln -s ... /etc/nginx/sites-enabled/
5. Verify,Run the safety test.,sudo nginx -t ✅
6. Go Live,Reload the service.,sudo systemctl reload nginx 🚀
