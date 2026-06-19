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
| `PORT`          | `3000`                     | Puerto del servidor HTTP                             |
| `LADA`          | `521`                      | Prefijo de país. Con `521` solo escribes 10 dígitos  |
| `GROUP_ID`      | `120363XXXXXXXXXX@g.us`    | ID del grupo destino (opcional)                      |
| `NUMERO_PRUEBA` | `1234567890`               | Número de prueba (10 dígitos)                        |

---
## Endpoints
Base URL: `http://localhost:3000`
---

### `GET /status`
Verifica si WhatsApp está conectado.

---

### `POST /mensaje`
Envía un mensaje de texto a un contacto. Solo necesitas los 10 dígitos del número — la lada se agrega automáticamente según `LADA` en el `.env`.
**Body**
```json
{
  "numero": "1234567890",
  "texto": "Hola desde la API!"
}

---
### `GET /grupos`
Lista todos los grupos en los que está el número conectado. Úsalo para obtener el `groupId` que necesitas en los otros endpoints.

---

### `POST /mensaje-grupo`
Envía un mensaje de texto a un grupo.
**Body**
```json
{
  "groupId": "120363XXXXXXXXXX@g.us",
  "texto": "Hola grupo!"
}


**Recrear docker img** 
docker compose up --build -d