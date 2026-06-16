# Sistema de Aceptación de Pedidos por Proximidad

## 📍 Descripción General

El sistema permite que los repartidores **acepten pedidos basándose en su proximidad geográfica**. Utiliza cálculo de distancia real mediante coordenadas GPS para filtrar y mostrar solo los pedidos que están dentro del radio de acción del repartidor.

---

## 🎯 Características Principales

### 1. **Radio de Acción Configurable**
- **Radio máximo**: 5 km (configurable en `deliveryAgent.maxRadius`)
- Solo se muestran pedidos dentro de este radio
- Si el repartidor se aleja, los pedidos desaparecen de la lista disponible

### 2. **Cálculo de Distancia Preciso**
- Utiliza la **fórmula de Haversine** para calcular distancia entre coordenadas GPS
- Convierte distancias menores a 1 km a metros
- Muestra distancia en tiempo real

### 3. **Sistema de Urgencia**
Cada pedido tiene un nivel de urgencia:
- 🔴 **ALTA**: Rojo - Pedidos urgentes con mayor pago
- 🟡 **NORMAL**: Naranja - Pedidos estándar
- 🟢 **BAJA**: Verde - Pedidos de menor prioridad

### 4. **Validación de Proximidad**
- Valida la distancia **antes** de aceptar el pedido
- Si el repartidor se aleja mientras acepta, rechaza la acción
- Previene aceptaciones fuera del radio permitido

---

## 📋 Flujo de Funcionamiento

### **En el Mapa (delivery-mapa.html)**

```
1. Carga de la página
   ↓
2. Sistema obtiene ubicación actual del repartidor
   Latitud: -13.8735° S
   Longitud: -76.1332° W
   ↓
3. Calcula distancia a TODOS los pedidos disponibles
   ↓
4. Filtra pedidos dentro del radio (5 km)
   ↓
5. Ordena por distancia (más cercano primero)
   ↓
6. Muestra en la sección "Pedidos Disponibles en tu Radio"
   ↓
7. Repartidor puede ACEPTAR o RECHAZAR cada pedido
   ↓
8. Sistema recarga cada 5 segundos automáticamente
```

### **Aceptar un Pedido**

```
Usuario hace clic en "Aceptar"
   ↓
Sistema valida que está dentro del radio
   ↓
Muestra confirmación con detalles
   ↓
Si confirma:
   - Guardar en localStorage
   - Remover de lista disponible
   - Mostrar en "Mis Entregas"
   - Notificar al usuario
```

### **En el Dashboard (dashboard-delivery.html)**

```
1. Carga de la página
   ↓
2. Lee pedidos aceptados del localStorage
   ↓
3. Combina con pedidos precargados
   ↓
4. Muestra en tabla "Entregas Activas"
   ↓
5. Permite ver detalles de cada pedido
   ↓
6. Actualiza cada 3 segundos automáticamente
```

---

## 🛠️ Configuración y Personalización

### **Cambiar Radio de Acción**

En `delivery-mapa.html`, línea ~11:

```javascript
const deliveryAgent = {
    name: 'Diego Rodríguez',
    latitude: -13.8735,
    longitude: -76.1332,
    maxRadius: 5, // ← Cambiar este valor (en km)
    disponible: true
};
```

### **Agregar Más Pedidos Disponibles**

En `delivery-mapa.html`, línea ~26:

```javascript
const pedidosDisponibles = [
    {
        id: 1056,
        cliente: 'Nuevo Cliente',
        direccion: 'Nueva Dirección',
        latitude: -13.9000,
        longitude: -76.1200,
        monto: 50.00,
        ganancia: 6.00,
        tiempo_entrega: 12,
        urgencia: 'alta'  // alta, normal, baja
    },
    // ... más pedidos
];
```

### **Cambiar Ubicación del Repartidor**

```javascript
const deliveryAgent = {
    name: 'Diego Rodríguez',
    latitude: -13.9000,  // ← Nueva latitud
    longitude: -76.1500, // ← Nueva longitud
    maxRadius: 5,
    disponible: true
};
```

---

## 📊 Datos Almacenados en localStorage

Los pedidos aceptados se guardan en `localStorage` con la clave `'entregas'`:

```javascript
{
    "entregas": [
        {
            "id": 1051,
            "cliente": "María López",
            "direccion": "Av. Secundaria 456",
            "monto": 52.50,
            "ganancia": 6.50,
            "estado": "En ruta",
            "aceptado_en": "21/4/2026, 10:30:45",
            "distancia": 0.8
        }
    ]
}
```

---

## 🔄 Actualización en Tiempo Real

- **Mapa**: Recarga la lista de pedidos **cada 5 segundos**
- **Dashboard**: Actualiza las entregas **cada 3 segundos**

Esto permite que el sistema responda a cambios de ubicación y nuevos pedidos disponibles.

---

## ✅ Validaciones Implementadas

1. **Proximidad**: Solo pedidos dentro del radio máximo
2. **Doble Validación**: Confirma proximidad antes de aceptar
3. **Prevención de Duplicados**: No permite aceptar el mismo pedido dos veces
4. **Datos Persistentes**: Los pedidos se guardan en localStorage

---

## 🚀 Casos de Uso

### Caso 1: Repartidor Disponible
```
- Repartidor está disponible
- Recibe notificación de nuevos pedidos cercanos
- Ve 3 pedidos dentro de 5 km
- Acepta el más cercano (0.8 km)
- Aparece en "Mis Entregas"
```

### Caso 2: Repartidor se Aleja
```
- Había 5 pedidos disponibles
- Repartidor se mueve 3 km más lejos
- Sistema recalcula distancias
- Algunos pedidos ahora están fuera del radio
- Solo 2 pedidos permanecen disponibles
```

### Caso 3: Rechazo de Pedido
```
- Repartidor ve un pedido
- Hace clic en "Rechazar"
- Pedido se elimina de la lista disponible
- Sistema busca más pedidos cercanos
```

---

## 🔧 Funciones Clave

### `calcularDistancia(lat1, lon1, lat2, lon2)`
Usa la fórmula de Haversine para calcular distancia entre dos puntos GPS.

### `cargarPedidosDisponibles()`
Filtra y muestra pedidos dentro del radio.

### `aceptarPedido(pedidoId, cliente, distancia)`
Valida y acepta un pedido, guardándolo en localStorage.

### `cargarPedidosAceptados()`
Lee los pedidos aceptados y los muestra en el dashboard.

---

## 📱 Tecnologías Utilizadas

- **HTML5** - Estructura
- **CSS3** - Estilos
- **JavaScript vanilla** - Lógica
- **localStorage** - Persistencia de datos
- **Fórmula de Haversine** - Cálculo de distancias GPS

---

## 🎓 Próximas Mejoras Sugeridas

1. ✅ Integración con Google Maps API real
2. ✅ Geolocalización automática del navegador
3. ✅ Sistema de notificaciones push
4. ✅ API Backend para sincronización en tiempo real
5. ✅ Historial de pedidos rechazados
6. ✅ Estadísticas de aceptación por zona
7. ✅ Filtros personalizados por urgencia

---

## 📞 Soporte

Para preguntas o problemas, consulta los comentarios en:
- `delivery-mapa.html` - Lógica de pedidos disponibles
- `dashboard-delivery.html` - Gestión de entregas activas
