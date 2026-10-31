# Pathrix

**Juego de estrategia por turnos para iOS y Android.** Dos jugadores colocan fichas de caminos para cerrar un bucle de su color o unir dos bordes opuestos del tablero. Se puede jugar contra la IA, con 4 niveles de dificultad, o online contra otros jugadores.

<!-- Añadir aquí capturas o un GIF de una partida -->
<!-- ![Pathrix](docs/capturas/partida.gif) -->

---

## Qué tiene de interesante

| | |
| --- | --- |
| **Motor de juego propio** | Reglas de colocación, movimientos forzados en cascada y detección de victoria (bucle o conexión de bordes), separados de la interfaz en `src/game-engine/`. |
| **IA con MCTS** | Monte Carlo Tree Search con 4 niveles de dificultad (`ai/AIEngine.ts`). La dificultad cambia con el presupuesto de simulaciones. |
| **Multijugador online sin servidor propio** | Emparejamiento por ELO, retos entre amigos y partidas sincronizadas en tiempo real con Firestore, protegidas con reglas de seguridad (`firestore.rules`). |
| **Cuentas completas** | Email, Google, Sign in with Apple e invitado. Foto de perfil, amigos, clasificación y borrado de cuenta. |
| **Pensado para móvil** | Respuesta háptica en cada acción, 6 idiomas detectados automáticamente según el dispositivo, fichas dibujadas en SVG. |

## Stack

- **React Native + Expo** (TypeScript), con builds de EAS
- **Zustand** para el estado del juego y de la sesión
- **Firebase**: Auth, Firestore y Storage
- `expo-haptics`, `expo-apple-authentication`, `expo-auth-session` y `expo-localization`

## Arquitectura

```
src/
  domain/         tipos y enums (Tile, GameState, PlayerColor…)
  game-engine/    GameEngine + reglas (colocación, movimientos forzados, victoria) + IA (MCTS)
  data/services/  FirebaseService: todas las llamadas a Firebase en un único sitio
  presentation/   stores (Zustand), componentes del tablero y pantallas
  core/           tema, i18n, hápticos y navegación
```

El motor no depende de React ni de Firebase: recibe un estado y devuelve el siguiente. Eso permite reutilizarlo en la IA, que simula miles de partidas, y en el modo online, que sincroniza el mismo estado a través de Firestore.

## Decisiones y siguientes pasos

- **Todo en el cliente, sin Cloud Functions**, para mantener el coste a cero en la primera versión. Las reglas de Firestore limitan qué puede escribir cada jugador.
- **Siguiente paso**: validar los movimientos y calcular el ELO en el servidor, con Cloud Functions, para que un cliente modificado no pueda hacer trampas.

## Arrancar en local

```bash
npm install
npx expo start
```

La configuración de Firebase en `FirebaseService.ts` es la configuración web pública del proyecto. La seguridad depende de las reglas de Firestore y Storage, no de ocultar esa configuración.

---

Diseñado y desarrollado por **Ronald Herrera** · [ronaldherrera.es](https://ronaldherrera.es) · [LinkedIn](https://linkedin.com/in/ronald-herrera)
