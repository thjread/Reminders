#!/bin/sh
cd secrets
openssl rand -base64 60 > jwt_secret
openssl ecparam -genkey -name prime256v1 -out private_key.pem
openssl ec -in private_key.pem -pubout -outform DER|tail -c 65|base64|tr '/+' '_-' > public_key
