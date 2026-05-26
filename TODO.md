# TODO

- [ ] Añadir filtro anti-profanidad en el registro de usuarios para impedir que el **nombre de usuario** contenga "fuck" (case-insensitive).
- [x] Implementar la validación en `src/context/AuthContext.jsx` dentro de `register`.

- [ ] Verificar con pruebas manuales:
  - [ ] Intentar registrarse con un `name` que contenga "fuck" y confirmar que falla con mensaje de error.
  - [ ] Intentar registrarse con un `name` válido y confirmar que se crea el usuario.

