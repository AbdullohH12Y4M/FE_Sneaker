Auth
Registrasi & Login pengguna



POST
/auth/register/admin


POST
/auth/register/customer
Registrasi pelanggan baru

Membuat akun pelanggan baru dengan email dan password. Email harus unik.

Parameters
Cancel
Reset
No parameters

Request body

application/json
Edit Value
Schema
{
  "email": "doni@gmail.com",
  "password": "111111"
}
Execute
Clear
Responses
Curl

curl -X 'POST' \
  'https://sneakerlocal.up.railway.app/auth/register/customer' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "doni@gmail.com",
  "password": "111111"
}'
Request URL
https://sneakerlocal.up.railway.app/auth/register/customer
Server response
Code	Details
201	
Response body
Download
{
  "user": {
    "id": "cmpy270gf000apc120560ugbg",
    "email": "doni@gmail.com",
    "role": "CUSTOMER"
  }
}
Response headers
 access-control-allow-credentials: true 
 access-control-allow-origin: https://ukl-4-fe.vercel.app,http://localhost:3000 
 content-encoding: gzip 
 content-type: application/json; charset=utf-8 
 date: Wed,03 Jun 2026 12:45:05 GMT 
 etag: W/"56-qpr/zwOXE/iy+I7wmGfQT5RQx8Y" 
 server: railway-hikari 
 vary: Origin,accept-encoding 
 x-hikari-trace: sin1.nzn2 
 x-powered-by: Express 
 x-railway-edge: railway/asia-southeast1-eqsg3a 
 x-railway-request-id: WnCUWjytSsecSr_fAXC71g 
Responses
Code	Description	Links
201	
Registrasi berhasil

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "user": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
No links
400	
Email sudah terdaftar atau validasi gagal

No links

POST
/auth/login
Login pengguna

Autentikasi dengan email dan password. Mengembalikan JWT access token.

Parameters
Cancel
Reset
No parameters

Request body

application/json
Edit Value
Schema
{
  "email": "doni@gmail.com",
  "password": "111111"
}
Execute
Clear
Responses
Curl

curl -X 'POST' \
  'https://sneakerlocal.up.railway.app/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "doni@gmail.com",
  "password": "111111"
}'
Request URL
https://sneakerlocal.up.railway.app/auth/login
Server response
Code	Details
201
Undocumented
Response body
Download
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXB5MjcwZ2YwMDBhcGMxMjA1NjB1Z2JnIiwiZW1haWwiOiJkb25pQGdtYWlsLmNvbSIsInJvbGUiOiJDVVNUT01FUiIsImlhdCI6MTc4MDQ5MDgzOCwiZXhwIjoxNzgxMDk1NjM4fQ.oRgpa0XexPOmcK15E_Ci1a-im1BtFIraeRR63ocJRp0",
  "user": {
    "id": "cmpy270gf000apc120560ugbg",
    "email": "doni@gmail.com",
    "role": "CUSTOMER"
  }
}
Response headers
 access-control-allow-credentials: true 
 access-control-allow-origin: https://ukl-4-fe.vercel.app,http://localhost:3000 
 content-encoding: gzip 
 content-type: application/json; charset=utf-8 
 date: Wed,03 Jun 2026 12:47:18 GMT 
 etag: W/"14f-pKXitUYUgwJC9GoStpf23g+qp6c" 
 server: railway-hikari 
 vary: Origin,accept-encoding 
 x-hikari-trace: sin1.nzn2 
 x-powered-by: Express 
 x-railway-edge: railway/asia-southeast1-eqsg3a 
 x-railway-request-id: KEQeyGdZSyqXrZBUV7rehQ 
Responses
Code	Description	Links
200	
Login berhasil

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "email": "user@example.com",
    "role": "ADMIN"
  }
}
No links
401	
Email atau password salah