FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 3000
CMD ["node", "src/index.js"]
```

**2. Ganti `railway.toml`** — hapus `startCommand`, tambah `dockerfilePath`

**3. Tambah `.dockerignore`** (file baru) dengan isi:
```
node_modules
.env
*.log
.DS_Store
.git
