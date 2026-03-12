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
    - [] make and add the architechture picture
    - [x] Architechture with image: network setup, vm setup, and data flow
    - [x] Setup & code explanation 


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
    - Since the MYSQL database runs in its own VM, I had to allow the 2 webservers to access this data by updating the `bind address` in ` /etc/mysql/mysql.conf.d/mysqld.cnf` file to listen to all/remote interfaces (`0.0.0.0`).
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
