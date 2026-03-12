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
- The `mysql-db-setup` script sets up mysql and adds facts data for the nginx-facts website.
- In **/etc/mysql/mysql.conf.d/mysqld.cnf**, update **bind address** to listen on all interfaces and allow other VMs to connect and access the data stored in MYSQL.
    ```bash
    bind-address = 0.0.0.0
    ```

    ### VMs setup
- 1: Hardware Setup for VM1 (The Gateway)

    For VM1 to act as a bridge between the internet and your private workers, it needs two virtual network cards (NICs).

    Create a New Virtual Machine: Select your Ubuntu 24.04 ISO.

    Network Configuration: By default, VMware gives you one adapter. We need to add a second one manually.

        Adapter 1: Set this to Bridged. This is your "Public" interface that talks to your home router. 🌐

        Adapter 2: Click "Add..." > "Network Adapter" and set this one to a LAN Segment.

    Create the LAN Segment: Click the "LAN Segments..." button and create a new one named Internal-Nginx-Lab. Select this segment for Adapter 2. ⛓️

- VM1: The Gateway & Load Balancer 🚦

    When you start the Ubuntu 24.04 installation for VM1, the installer will reach the "Network connections" screen. Because you added two adapters in VMware, you should see two interfaces (likely named ens33 and ens34 or similar).

    Interface 1 (Bridged): This should automatically show an IP address from your physical router (e.g., 192.168.1.XX). This is your link to the internet.

    Interface 2 (LAN Segment): This will likely show "no IP" or a self-assigned address because there is no DHCP server on a LAN Segment.

    For the LAN Segment interface, we want to set a Manual (Static) IP right now in the installer. This will be the "Internal Gateway" address that all other VMs use to find the internet and the Load Balancer.
    Setting the Internal IP

    Let's use the 192.168.10.X range for our private network:

    Subnet: 192.168.10.0/24

    Address: 192.168.10.1 (This will be VM1's internal identity)

    Gateway: Leave this blank for this specific interface (VM1 gets its internet from the Bridged interface, not itself).

    Name servers: You can use Google's 8.8.8.8, 8.8.4.4.

    Once you finish the installation and log in to VM1, we can verify the setup.

    ens33 is your gateway to the internet 🌐, and ens34 is the "front door" for your internal private network 🏠.
- Now we need to transform VM1 from a standard server into a router. By default, Linux won't pass traffic from one interface to another. We have to explicitly enable IP Forwarding so that when your workers (VM2, VM3) send requests to VM1, it knows how to pass them out to the internet.
    1. Enable IP Forwarding

    First, let's tell the kernel to allow forwarding. Run this command to check the current status:
    cat /proc/sys/net/ipv4/ip_forward

    If it returns 0, forwarding is off. If it returns 1, it's already on.
    2. Configure NAT (Masquerading)

    Even with forwarding on, the internet won't know how to send data back to your private 192.168.10.x addresses. We use IP Masquerading to hide the private IPs behind VM1's public IP.

    We can use iptables to set this up. The command looks like this:
    sudo iptables -t nat -A POSTROUTING -o ens33 -j MASQUERADE

- Since we want VM1 to act as a router every time it starts up, we need to edit a configuration file so this setting persists after a reboot.

    Open the sysctl configuration: sudo nano /etc/sysctl.conf

    Look for the line: #net.ipv4.ip_forward=1

    Uncomment it by removing the #.

- Setting up the Workers (VM2, VM3, VM4) 🏗️

Now, let's look at the installation of these three VMs. In VMware, when you create them:

    Give them only one network adapter.

    Connect that adapter to your LAN Segment (Internal-Nginx-Lab).
During the Ubuntu installation for these machines, you'll need to configure the network manually, just like we did for VM1's second interface. However, there is one crucial difference: these machines need a Default Gateway. 🚦

If you are setting up VM2 (Worker 1) right now, you would enter:

    Subnet: 192.168.10.0/24

    Address: 192.168.10.2

    Gateway: 192.168.10.1 (VM1s internal LAN IP)

- VM3: The Second Worker 🏗️

Since your goal is load balancing, VM3 needs to be a "twin" of VM2. This allows VM1 to split traffic between them.

    Network: Add one adapter set to your LAN Segment (Internal-Nginx-Lab).

    Static IP Configuration:

        Address: 192.168.10.3/24

        Gateway: 192.168.10.1 (Points back to your VM1 router)

        DNS: 8.8.8.8, 8.8.4.4

VM4: The Dedicated Database 💾

This VM is the most "protected" part of your network. In a professional setup, the database stays at the very back of the architecture.

    Network: Add one adapter set to the same LAN Segment.

    Static IP Configuration:

        Address: 192.168.10.4/24

        Gateway: 192.168.10.1

        DNS: 8.8.8.8, 8.8.4.4

- Verifying the Internal "Web" 🕸️

Now that you have the IPs assigned, we need to make sure the VMs can talk to each other, not just the internet. This is vital for your CRUD app because the workers (VM2, VM3) must be able to reach the database (VM4).

Once you have finished installing VM3 and VM4, let's run a quick connectivity check.

From the terminal of VM2, can you successfully ping the other internal members of the team?

    ping -c 2 192.168.10.3 (Checking the other worker)

    ping -c 2 192.168.10.4 (Checking the database)

## NGINX Deployment Summary

| Step | Action | Command / Location |
| :--- | :--- | :--- |
| **1. Files** | Create a unique folder for the site. | `/var/www/yourdomain.com/html` |
| **2. Config** | Create a named file (not editing default). | `/etc/nginx/sites-available/yourdomain.com` |
| **3. Identity** | Set the `server_name` and `root`. | Inside the config file ✍️ |
| **4. Enable** | Create the symbolic link. | `sudo ln -s ... /etc/nginx/sites-enabled/` |
| **5. Verify** | Run the safety test. | `sudo nginx -t` ✅ |
| **6. Go Live** | Reload the service. | `sudo systemctl reload nginx` 🚀 |


=============================================================================================================================

# Nginx Load Balancing & Reverse Proxy Web Server

This project was built with a `security-first mindset` and `designed for seamless scalability`.

- todo:
    - [x] Architechture with image: network setup, vm setup, and data flow
    - [] Setup & code explanation 


## Architechture

### 🌐 The Edge Layer: VM1 (Load Balancer & Default Gateway For The Other 3 Servers)

VM1 is the shield, front door and the server the public talks to requesting for my Nginx Facts website.

It has Nginx installed and set up as a load balancer pointing to the 2 webservers.

I set it up to have 2 network adapters: for a `Bridged Adapter Network` and a `Private LAN Network`.

It is the only server visible to the outside world via its `Bridged adapter`. On the private side, it manages a `private subnet`, providing a secure environment for the other 3 servers.

I enabled `IP Forwarding` to allow traffic to pass between these two worlds. Because my internal VMs (VM2-4) have private IPs that the public internet doesn't recognize, I used `IP Masquerading (NAT)`. This ***masks*** the 3 VMs' requests with VM1's public IP so they can download updates without being directly exposed to the public/hackers.

### 🏗️ The Application Layer: VM2 & VM3 (Websevers)

These are my actual web servers. Each has Nginx installed to serve static react build files and a reverse proxied ExpressJS API. 

Basically, each of these 2 servers, serves the Nginx Facts website.

They are completely isolated from the internet for security. They use VM1 as their Default Gateway to reach the outside world.

The load balancer (VM1) hands all website and API requests to these 2 servers in round robin fashion. They in turn respond by serving the Nginx Facts website files/data to the load balancer who in turn gives the request back to the client's browser to display the website.

### 💾 The Data Layer: VM4 (Database)

This is the MYSQL database.

Through systemd, the `mysql` service runs 24/7 providing a **high availability for data access** from the webservers.  

Only the webservers (VM2 & VM3) in the private LAN network have access to the database.

Since it sits in a private network this ensures that even if the load balancer (VM1) is compromised, the database remains hidden from direct public access.

## Network Setup

## Logic

- Centralized DB: Both Webserver VMs (VM1 & VM2) connect to a single, dedicated Database VM (VM4). This ensures **data integrity**, no matter which webserver a user hits, they see the same nginx facts. If a user adds a new fact while connected to any of the webservers, that fact will exist on the other webserver too. The data becomes consistent. A single source of truth.

---

## VMs Setup

### MYSQL Setup
- Git cloned this project in VM4.
- Then made an `.env` file in `/demo-website/backend` with the necessary variables to run the api and the database.
- Finally, ran this script on VM4 for a full MYSQL database installation and setup:
    ```bash
    sudo ./mysql-db-setup
    ```
- Extra configs and details to note:
    - Since the MYSQL database runs in its own VM, I had to allow the 2 webservers to access this data by updating the `bind address` in ` /etc/mysql/mysql.conf.d/mysqld.cnf` file to listen to all/remote interfaces (`0.0.0.0`).
        ```bash
        bind-address = 0.0.0.0
        ```

### Web Servers Setup
- Ran this script for a full nginx webserver setup:
    ```bash
    sudo ./deploy-nginx
    ```
- Steps and script explanation:
    - from the **load balancer VM**, I SSH-ed into each **Web Server VM**
    - I then ran `deploy-nginx` script on each server to serve the website. The website runs React build in the frontend and an expressjs api in the backend that fetches its data from the MYSQL database running in the MYSQL VM.
        ```bash
        sudo ./deploy-nginx
        ```

### Load Balancer Setup
- Ran this script for a full nginx loadbalancer setup:
    ```bash
    sudo ./loadbalancer-setup
    ```
- In this script, I:
    - Created a custom file **nginx-facts-loadbalancer** for the nginx loadbalancer configs in **/etc/nginx/sites-available/**.
    - Used default **round robin** algorithm for my load balancer and pointed/linked to my 2 server VMs using the **server** directive.
        ```bash
        upstream webapp-servers {
            server webserver1 192.168.10.2;
            server webserver2 192.168.10.3;
        }
        ```
        - **webserver1** and **webserver2** are just hostnames I gave the 2 servers' IPs in `/etc/hosts` file.
            <img width="1644" height="135" alt="Screenshot_20260309_072039" src="https://github.com/user-attachments/assets/305616c2-811b-4cc8-a1a6-77f780ccdf05" />

    - Enabled the website configs:
        ```bash
        sudo ln -sf /etc/nginx/sites-available/nginx-facts-loadbalancer /etc/nginx/sites-enabled/
        ```
    - Checked for nginx syntax errors in config:
        ```bash
        sudo nginx -t
        ```
    - All configs were good, so I restarted the nginx service in systemd with the updated changes:
        ```bash
        sudo systemctl reload nginx
        ```


## Explanation Of Other Key Configurations

### Firewall configuration (`ufw`)

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

### VMs Network and Subnet Configuration

For VM1's private LAN network, I created a `subnet` network of 192.168.10.0/24 in the `ubuntu` OS setup of VM1 in `VMWare`. I made VM1 the default gateway for this whole subnet with an IP of 192.168.10.1.

Here, are all the `netplan` configurations made to each VM.

- VM1 (load balancer & default gateway) `netplan` configuration.
    ```bash
    network:
    version: 2
    ethernets:
        ens33:
        dhcp4: no
        addresses:
            - 192.168.100.207/24
        routes:
            - to: default
            via: 192.168.100.1
        nameservers:
            addresses: [8.8.8.8, 8.8.4.4]
        ens34:
        addresses:
        - 192.168.10.1/24
    ```
- VM2 (webserver) `netplan` configuration.
    ```bash
    network:
    version: 2
    ethernets:
        ens33:
        addresses:
        - "192.168.10.2/24"
        nameservers:
            addresses:
            - 8.8.8.8
            - 8.8.4.4
            search: []
        routes:
        - to: "default"
            via: "192.168.10.1"
    ```

- VM3 (webserver) `netplan` configuration.
    ```bash
    network:
    version: 2
    ethernets:
        ens33:
        addresses:
        - "192.168.10.3/24"
        nameservers:
            addresses:
            - 8.8.8.8
            - 8.8.4.4
            search: []
        routes:
        - to: "default"
            via: "192.168.10.1"
    ```

- VM4 (MYSQL Database) `netplan` configuration.
    ```bash
    network:
    version: 2
    ethernets:
        ens33:
        addresses:
        - "192.168.10.4/24"
        nameservers:
            addresses:
            - 8.8.8.8
            - 8.8.4.4
            search: []
        routes:
        - to: "default"
            via: "192.168.10.1"
    ```
