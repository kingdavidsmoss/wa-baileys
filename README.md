# WA Bayles

Bot de WhatsApp construido con [Baileys](https://github.com/WhiskeySockets/Baileys) y expuesto como API REST.

## Requisitos

- Docker y Docker Compose

## Levantar el proyecto

```bash
# Copia el archivo de variables de entorno
cp .env.example .env

# Construye y levanta en background
docker compose up --build -d

# Ve los logs para escanear el QR
docker compose logs -f
```

Escanea el QR desde WhatsApp → **Ajustes → Dispositivos vinculados → Vincular dispositivo**.

La sesión queda guardada en `./auth_info/`. Los siguientes arranques no piden QR.

## Variables de entorno (`.env`)

| Variable        | Ejemplo                    | Descripción                                          |
|-----------------|----------------------------|------------------------------------------------------|
| `PORT`            | `3000`                     | Puerto del servidor HTTP                             |
| `API_KEY`         | `5184c721...`              | Clave de acceso. Genera una con `openssl rand -hex 32` |
| `RATE_LIMIT_MAX`  | `20`                       | Máximo de peticiones por minuto por IP              |
| `LADA`            | `521`                      | Prefijo de país. Con `521` solo escribes 10 dígitos  |
| `GROUP_ID`        | `120363XXXXXXXXXX@g.us`    | ID del grupo destino (opcional)                      |
| `NUMERO_PRUEBA`   | `1234567890`               | Número de prueba (10 dígitos)                        |

---
## Seguridad

Todos los endpoints de envío requieren el header **`x-api-key`** con el valor de `API_KEY` del `.env`. Sin él, la API responde `401 No autorizado`.

```
x-api-key: TU_API_KEY
```

Además hay **rate limiting** (`RATE_LIMIT_MAX` peticiones por minuto por IP) para proteger tu número de un baneo por spam.

> ⚠️ No expongas el puerto a internet directamente. Si necesitas acceso remoto, ponlo detrás de un reverse proxy con HTTPS (nginx, Caddy, Cloudflare Tunnel).

---
## Endpoints
Base URL: `http://localhost:3000`
---

### `GET /status`
Verifica si WhatsApp está conectado. **No requiere API key.**

---

### `POST /mensaje`
Envía un mensaje de texto a un contacto. Solo necesitas los 10 dígitos del número — la lada se agrega automáticamente según `LADA` en el `.env`.

**Headers:** `x-api-key: TU_API_KEY`

**Body**
```json
{
  "numero": "1234567890",
  "texto": "Hola desde la API!"
}

---
### `GET /grupos`
Lista todos los grupos en los que está el número conectado. Úsalo para obtener el `groupId` que necesitas en los otros endpoints.

**Headers:** `x-api-key: TU_API_KEY`

---

### `POST /mensaje-grupo`
Envía un mensaje de texto a un grupo.

**Headers:** `x-api-key: TU_API_KEY`

**Body**
```json
{
  "groupId": "120363XXXXXXXXXX@g.us",
  "texto": "Hola grupo!"
}


**Recrear docker img** 
docker compose up --build -d