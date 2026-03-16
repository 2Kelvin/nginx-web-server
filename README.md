# Nginx Load Balancing & Reverse Proxy Web Server

This project was built with a `security-first mindset` and `designed for seamless scalability`.

## Architechture

<img width="1408" height="768" alt="Gemini_Generated_Image_jhcglmjhcglmjhcg" src="https://github.com/user-attachments/assets/250b76d3-2ce3-44a4-9a23-8118098145aa" />

### 🌐 The Edge Layer: VM1 (Load Balancer & Default Gateway For The Other 3 Servers)

- VM1 is the shield, front door and the server the public talks to requesting for the Nginx Facts website.

- It has Nginx installed and set up as a load balancer pointing to the 2 webservers.

- I set it up to have 2 network adapters: a `Bridged Network Adapter` and a `Private LAN`.

- It is the only server visible to the outside world via its `Bridged adapter`. On the private side, it manages a `private subnet`, providing a secure environment for the other 3 servers.

- I enabled `IP Forwarding` to allow traffic to pass between these two worlds. Because my internal VMs (VM2-4) have private IPs that the public internet doesn't recognize, I used `IP Masquerading (NAT)`. This ***masks*** the 3 VMs' requests with VM1's public IP so they can download updates without being directly exposed to the public.

### 🏗️ The Application Layer: VM2 & VM3 (Websevers)

- These are the actual web servers. Each has Nginx installed to serve static react build files and a reverse proxied ExpressJS API. 

- Basically, each of these 2 servers, serves the Nginx Facts website.

- They are completely isolated from the internet for security. They use VM1 as their Default Gateway to reach the outside world.

- The load balancer (VM1) hands all website and API requests to these 2 servers in round robin fashion. They in turn respond by serving the Nginx Facts website files/api data to the load balancer who in turn gives the request back to the client's browser to display the website.

### 💾 The Data Layer: VM4 (Database)

- This is the MYSQL database.

- Through systemd, the `mysql` service runs 24/7 providing ***high availability for data access*** from the webservers.  

- Only the webservers (VM2 & VM3) in the private LAN network have access to the database.

- Since it sits in a private network this ensures that even if the load balancer (VM1) is compromised, the database remains hidden from direct public access.

## Network Setup Summary & Walk Through

For VM1 to act as a bridge between the internet and the private servers, it has two virtual network cards (NICs) assigned to it:
- Adapter 1: is set to a `Bridged network`. This is the **Public interface** that talks to the router and the internet.
- Adapter 2: is set to a `LAN Segment network`. VM1 is assigned as the default gateway of this subnet and of all the other 3 servers defined in this private LAN.
- Finally, for the servers in the private network to access the internet, I enabled port forwarding in VM1 and IP Masquerading to mask each private server's IP with VM1's public IP.

For the private servers: (the 2 webservers and 1 database server) I added each one of them in the subnet created in VM1 and configured VM1's internal LAN IP as their default gateway. This way, they are all hidden from the internet. If in need of internet, they can do so securely through VM1's public IP which masks their real private IPs.

With this network setup, all the servers can communicate securely in that internal LAN. Upon getting a web/api request, the load balancer can direct the traffic securely to the 2 webservers which in turn fetch the data securely from the database located in the same subnet as them, then finally the servers hand the website response to the load balancer to give to the user to display the website in a browser. 

## Centralized Database

Both ebserver VMs (VM1 & VM2) connect to a single, dedicated Database VM (VM4). This ensures **data integrity**, no matter which webserver a user hits, they see the same nginx facts. If a user adds a new fact while connected to any of the webservers, that fact will exist on the other webserver too. The data becomes consistent. A single source of truth.


## VMs Setup

### MYSQL Setup
- Git cloned this project in VM4.
    ```bash
    git clone https://github.com/2Kelvin/nginx-web-server.git
    ```
- Navigated into the repo.
    ```bash
    cd nginx-web-server
    ```
- Then manually added an `.env` file in `/demo-website/backend` with the necessary variables to run the api and the database.
- Finally, ran this script on the VM4 server for a full MYSQL database installation and setup:
    ```bash
    sudo ./mysql-db-setup
    ```
- Extra configs and details to note:
    - Since the MYSQL database runs in its own VM, I had to allow the 2 webservers to access this data by updating the `bind address` in ` /etc/mysql/mysql.conf.d/mysqld.cnf` file to listen on all/remote interfaces (`0.0.0.0`).
        ```bash
        bind-address = 0.0.0.0
        ```

### Web Servers Setup
- Git cloned this project in each webserver (VM2 & VM3).
    ```bash
    git clone https://github.com/2Kelvin/nginx-web-server.git
    ```
- Navigated into the repo.
    ```bash
    cd nginx-web-server
    ```
- Ran this script for a full nginx webserver setup.
    ```bash
    sudo ./deploy-nginx
    ```

### Load Balancer Setup
- Git cloned this project in the load balancer server (VM1).
    ```bash
    git clone https://github.com/2Kelvin/nginx-web-server.git
    ```
- Navigated into the repo.
    ```bash
    cd nginx-web-server
    ```
- Ran this script for a full nginx load balancing setup.
    ```bash
    sudo ./loadbalancer-setup
    ```

## Explanation Of Other Key Configurations

### Firewall configuration (`ufw`)

I allowed the essential web server & ssh ports past the firewall: `ssh`:`port 22`, `http`:`port 80` & `https`: `port 443`
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# activating ufw with all the above firewall rules
sudo ufw enable

# checking enabled ports
sudo ufw status
```

### Subnet Configuration

For VM1's private LAN network, I created a `subnet` network of 192.168.10.0/24 in the `Ubuntu OS` setup of VM1 in `VMWare`. I made VM1 the default gateway for this whole subnet with an IP of 192.168.10.1.

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

## NGINX Simple Deployment Summary

| Step | Action | Command / Location |
| :--- | :--- | :--- |
| **1. Files** | Create a unique folder for the website. | `/var/www/mydomain.com/html` |
| **2. Config** | Create a named config file (not editing default). | `/etc/nginx/sites-available/mydomain.com` |
| **3. Identity** | Set the `server_name` and `root`. | Inside the config file ✍️ |
| **4. Enable** | Create the symbolic link. | `sudo ln -s /etc/nginx/sites-available/mydomain.com /etc/nginx/sites-enabled/` |
| **5. Verify** | Run nginx safety test. | `sudo nginx -t` ✅ |
| **6. Go Live** | Reload nginx service. | `sudo systemctl reload nginx` 🚀 |
