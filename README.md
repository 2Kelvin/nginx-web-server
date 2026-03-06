# Nginx Reverse Proxy & Web Server

## Installation &  Setup

- Git clone this repo to your server's home directory.
    ```bash
    git clone https://github.com/2Kelvin/nginx-web-server.git
    ```

- Navigate into the repo.
    ```bash
    cd nginx-web-server
    ```

- Give `nginx-install` excutable permission, if not given already.
    ```bash
    chmod +x nginx-install
    ```

- Run `nginx-install` with admin privileges to install and setup nginx, ufw and the whole Nginx Facts website.
    ```bash
    sudo ./nginx-install
    ```
    Just a quick note: before installing nginx the script updates apt and upgrade the system first to fetch the latest versions of all installed packages for better compatibility with nginx and avoiding bugs and security issues.

## Script Explanation

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


### Nginx Web Server Setup

The demo website is a simple fullstack app about Nginx Facts running `react in the frontend` and `ExpressJS in the backend`. Since Nginx excels at serving static sites, I made a build of this website by running `npm run build`. These `build files` is what nginx will serve. Let's set it up:

- Create the website folder in `/var/www/`
    ```bash
    sudo mkdir -p /var/www/nginx-facts-website/html
    ```

- From **demo website/frontend** folder, copy all the `build folder contents` into `/var/www/nginx-facts-website/html` directory created above for our website to be served by Nginx.
    ```bash
    sudo cp -r demo-website/frontend/build/* /var/www/nginx-facts-website/html/
    ```

- Nginx nginx-facts website configuration:
    ```bash
    # grabbing the ip address of the server (ipv4 is the first one)
    server_ip_address=$(hostname -I | awk '{print $1}')
    sudo tee /etc/nginx/sites-available/nginx-facts <<EOF
    server {
        # using the ip address we fetched above to link to our server 
        server_name $server_ip_address;
        # folder containing our web files to be hosted
        root /var/www/nginx-facts-website/html;
        # nginx to serve the index.html file in our web folder above
        index index.html;

        location / {
            # fixing routing: how to map the user route requests and the fallback route
            # it says: navigate to file with the name the user typed if no file found navigate to the folder of that name ... 
            # ... if no folder found navigate to default index.html page
            try_files \$uri \$uri/ /index.html;
        }

        # nodejs api configuration
        location /api/facts {
            # reverse proxy: grab the api service running locally on port 5000
            proxy_pass http://127.0.0.1:5000;
            # setting up proxies
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
    EOF
    ```
We're creating a website server block for our website to be served by nginx; we first give nginx our server name (replace this with your server's name/IP/host name). The server name is the ip or host name the user types in the browser trying to connect and make a request to our server. The root directive tells nginx where our website files lives, so the user requests are served the files in there. **/var/www/nginx-facts-website/html**: This is the folder we created earlier containing the build folder contents of our fullstack app.

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

    ### ExpressJS Backend API Setup

- Create a separate folder in user's home to store the backend api server; this is where it will be running from.
    ```bash
    mkdir "$HOME/apis/nginx-facts"
    ```

- Move the all the backend code to this **nginx-facts** folder
    ```bash
    sudo cp -r demo-website/backend/* "$HOME/apis/nginx-facts"
    ```

- Move into our newly created api folder
    ```bash
    cd "$HOME/apis/nginx-facts"
    ```

- Install all backend api project dependencies
    ```bash
    npm i
    ```

    ## Setup a `systemd service` for running the api 24/7 and persistently across reboots
    ```bash
    sudo tee $service_path > /dev/null <<EOF
    [Unit]
    Description=Persistently running Nginx Facts website API
    # start the api only after the server's network is setup
    After=network.target 

    [Service]
    # grab current user's username and group name to setup ownership and permission for this nginx-facts-api service
    # working directory allows the service to path to the necessary folder containing required folders like node modules to run the api
    # execstart is basically doing: node server.js
    # restart makes sure the api automatically restarts on crashing; restartsec executes the api restart after 5 seconds of failing to prevent some well known issues of restarting immediately after a process crashes
    # Environment=NODE_ENV=production: improves nodejs performance in production
    User=$USER
    Group=$USER
    WorkingDirectory=$api_folder
    ExecStart=$node_bin $api_folder/server.js
    Environment=NODE_ENV=production
    Restart=always
    RestartSec=5

    [Install]
    # ensures the service starts automatically everytime the server boots
    WantedBy=multi-user.target
    EOF

    # update systemd to acknowledge the new .service config we added
    sudo systemctl daemon-reload
    # start the nginx-facts-api.service immediately and persist upon reboot
    sudo systemctl enable --now "$service_name.service"
    # checking if the service is active and running
    sudo systemctl status "$service_name.service"
    ```
    An API is a "Long-Running Process." You want it to start once and stay awake 24/7 to listen for users. For this, you only need a .service file. Timers trigger tasks to be performed at particular times/intervals then shutdown but apis run all the time; the restart=always is what the .service file uses to run the api all the time even if it crashes.

    ### MYSQL Setup

- In **/etc/mysql/mysql.conf.d/mysqld.cnf**, update **bind address** to listen on all interfaces and allow other VMs to connect and access the data stored in MYSQL.
    ```bash
    bind-address = 0.0.0.0
    ```

    ### VMs setup
- Give all VMs static IPs for consistency and prevent breaking connections caused by dynamically reassigned IPs by DNS

## NGINX Deployment Summary

| Step | Action | Command / Location |
| :--- | :--- | :--- |
| **1. Files** | Create a unique folder for the site. | `/var/www/yourdomain.com/html` |
| **2. Config** | Create a named file (not editing default). | `/etc/nginx/sites-available/yourdomain.com` |
| **3. Identity** | Set the `server_name` and `root`. | Inside the config file ✍️ |
| **4. Enable** | Create the symbolic link. | `sudo ln -s ... /etc/nginx/sites-enabled/` |
| **5. Verify** | Run the safety test. | `sudo nginx -t` ✅ |
| **6. Go Live** | Reload the service. | `sudo systemctl reload nginx` 🚀 |
