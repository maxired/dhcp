#!/bin/bash

sudo sysctl net.ipv4.ip_forward=1
sudo iptables -A POSTROUTING -o docker0 -p udp -m udp --dport 68 -j CHECKSUM --checksum-fill  -t mangle

