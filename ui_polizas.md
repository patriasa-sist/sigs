Esta es una lista de todos los diferentes formularios necesarios para crear una nueva poliza segun el ramo de la misma, tomar en cuenta que estas son las variaciones del paso 3 de la implementacion en el sistema de registro de polizas:
Orden: implementar todos los formularios con detalles provistos y dejar un mensaje temporal de "en trabajo" si no se encuentra el formulario especifico para el ramo

1. Campos obligatorios salud:

-   tipo de poliza (dropdown individual o corporativo)
-   Suma asegurada (numero)
-   Regional Asegurado (dropdown regional de los 9 departamentos de Bolivia fijo)
-   busqueda de cliente para ir agregando a una lista de 1 o mas asegurados, se debe definir en cada cliente seleccionado su rango (contratante, titular, conyugue, dependiente) pueden haber uno o mas dependientes pero solo 1 contratante, 1 titular y 1 conyugue, el contratante esta separado del titular porque puede ser una empresa la que contrata el seguro para sus empleados, se puede repetir la misma persona para contratante y titular que son las dos personas minimas necesarias. boton de agregar asegurado

2. campos obligatorios Incendio y aliados:

-   tipo de poliza (dropdown individual o corporativo)
-   regional asegurado (dropdown regional de los 9 departamentos de Bolivia fijo)
-   busqueda de cliente para ir agregando a una lista de 1 o mas asegurados
-   valor asegurado (numero)
-   direccion del bien asegurado (texto) 1 o mas direcciones admitidas
-   valor declarado $ (numero) que va junto a la direccion del bien asegurado 1 por cada direccion
-   PRIMER RIESGO: marcar la direccion principal del bien asegurado

*   se pueden tener N bienes asegurados en una misma poliza

3. campos obligatorios de responsabilidad civil:

-   tipo de poliza (dropdown individual o corporativo)
-   VALOR ASEGURADO: BS/USD
-   busqueda de cliente para ir agregando a una lista de 1 o más asegurados

4. campos obligatorios de Riesgos varios misceláneos:
   COBERTURAS:

-   CONVENIO 1 INFIDELIDAD DE EMPLEADOS (numero) Bs/USD
-   CONVENIO 2 PERDIDAS DENTRO DEL LOCAL (numero) Bs/USD
-   CONVENIO 3 PERDIDAS FUERA DENTRO DEL LOCALES (numero) Bs/USD
-   VALOR TOTAL ASEGURADO con moneda BS/USD
-   busqueda de cliente para ir agregando a una lista de 1 o más asegurados

5. En las polizas de accidentes personales, Vida y Sepelio se tiene un formulario previo antes del paso 3 que llamaremos paso especial 2.1 donde se deben definir los niveles de cobertura que tiene la poliza, esto es unico para Accidentes personales y Vida, y se declara de la siguiente manera:

-   se tiene una seccion donde se puede habilitar o deshabilitar las siguientes coberturas para Accidentes personales:
    [X] MUERTE ACCIDENTAL
    [X] INVALIDEZ TOTAL/PARCIAL
    [X] GASTOS MEDICOS
    [X] SEPELIO
-   para Vida:
    [X] MUERTE (por cualquier causa)
    [X] DIMA
    [X] SEPELIO
    [X] GASTOS MEDICOS
    [X] INDM POR ENFERMEDADES GRAVES
-   para Sepelio de corto y largo plazo:
    [X] SEPELIO
-   si se habilita la cobertura se debe agregar el valor asegurado de la misma
-   cuando todo haya sido configurado propiamente se debe hacer un boton de "crear nivel" para agregar un nuevo nivel de cobertura (Nivel 1, nivel 2, etc) ya se que se pueden tener N niveles de cobertura
-   una vez se haya concluido esta configuracion previa recién se va al paso 3 que es el formulario principal de la poliza

*   campos obligatorios de Accidentes personales, tambien de polizas de Vida y tambien de polizas de Sepelio:

-   tipo de poliza (dropdown individual o corporativo)
-   regional asegurado (dropdown regional de los 9 departamentos de Bolivia fijo)
-   busqueda de cliente y asignacion de su nivel previamente configurado en el paso 2.1, se pueden tener N asegurados con 1 solo nivel de cobertura

*   campos opcionales de Accidentes personales, tambien de polizas de Vida y tambien de polizas de Sepelio:

-   Producto (texto)
