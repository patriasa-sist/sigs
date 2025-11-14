What I really want is to reestructure the client form so we meet the following requirements:

1. I need to structure the forms in a more intuitive way presenting first the "datos personales", then "informacion de contacto", then "otros datos" and finally "documentos"(isnt implemented yet but keep in mind) so the user can easily navigate through the form.
2. we will simplify the client tiers so following upadted fields are required unless stated otherwise, update the forms and create a update sql file for me to execute:

# NATURAL CLIENT:

-   PRIMER NOMBRE = normalized, uppercased
-   SEGUNDO NOMBRE = optional, normalized, uppercased
-   PRIMER APELLIDO = normalized, uppercased
-   SEGUNDO APELLIDO = optional, normalized, uppercased
-   TIPO DE DOCUMENTO = [ci, pasaporte]
-   NUMERO DOCUMENTO = normalized, uppercased,not less than 6 characters
-   EXTENCION = optional, normalized, uppercased
-   NACIONALIDAD = normalized, uppercased
-   FECHA NACIMIENTO = DD-MM-YYYY
-   ESTADO CIVIL [casado, soltero, divorciado, viudo]
-   DIRECCIÓN = normalized, uppercased, contact info section
-   CORREO ELECTRONICO = normalized, validated, contact info section
-   CELULAR = only numbers, not less than 5 digits, contact info section
-   PROFESIÓN U OFICIO = normalized, uppercased, otros info section
-   ACTIVIDAD ECONOMICA = normalized, uppercased, otros info section
-   LUGAR DE TRABAJO = normalized, uppercased, otros info section
-   PAÍS DE RESIDENCIA = normalized, uppercased, otros info section
-   GENERO = [masculino, femenino, otro], otros info section
-   NIVEL DE INGRESOS = on the db this has to be a number but on the form is dropdown menu that sets a value on a number field next to it, [bajo=2000, medio=5000, alto=10000], otros info section
-   CARGO = normalized, uppercased, otros info section
-   AÑO DE INGRESO = DD-MM-YYYY, otros info section
-   NIT = optional, only numbers, not less than 7 digits, otros info section
-   DOMICILIO COMERCIAL = normalized, uppercased, otros info section, is it possible to check a checkbox "same as direccion" to copy the data from the direccion field if both are the same?

## if the client has a partner (aka: casado) the following fields are required, maybe store them on a separated table on the db i dont know the best approach propose me the best practice:

-   PRIMER NOMBRE = normalized, uppercased
-   SEGUNDO NOMBRE = optional, normalized, uppercased
-   PRIMER APELLIDO = normalized, uppercased
-   SEGUNDO APELLIDO = optional, normalized, uppercased
-   DIRECCIÓN = normalized, uppercased
-   CELULAR = only numbers, not less than 5 digits
-   CORREO ELECTRONICO = normalized, validated
-   PROFESIÓN U OFICIO = normalized, uppercased
-   ACTIVIDAD ECONOMICA = normalized, uppercased
-   LUGAR DE TRABAJO = normalized, uppercased

# UNIPERSONAL CLIENT (new client type that extends from the natural client type and I dont know if have it as more fields on the natural client form or create a new form for the unipersonal client type, this client inherits all the fields from the natural client type plus the following that some fields are duplicated i dont know if is a good idea or not have it that way):

-   razon social = normalized, uppercased
-   NIT = required, only numbers, not less than 7 digits
-   Numero de matricula de comercio = optional, not less than 7 characters
-   Domicilio comercial = normalized, uppercased
-   Telefono = only numbers, not less than 5 digits
-   ACTIVIDAD ECONOMICA = normalized, uppercased
-   NIVEL DE INGRESOS = on the db this has to be a number but on the form is dropdown menu that sets a value on a number field next to it, [bajo=2000, medio=5000, alto=10000], UIF info section
-   Correo electronico = normalized, validated, checkbox for same as correo electronico
-   Nombre del propietario = normalized, uppercased, checkbox for same as nombre(primer + segundo nombre)
-   Apellido del propietario = normalized, uppercased, checkbox for same as apellido (primer + segundo apellido)
-   Numero de identificacion del propietario = only numbers, not less than 7 digits, checkbox for same as document id
-   Extension del documento = optional, normalized, uppercased, checkbox for same as extension
-   Nacionalidad del propietario = normalized, uppercased, checkbox for same as nacionalidad
-   Nombre y apellido del representante legal = normalized, uppercased, checkbox for same as propietario
-   Ci del representante legal = only numbers, not less than 7 digits, checkbox for same as document id
-   Extension del documento = optional, normalized, uppercased, checkbox for same as extension

# JURIDICO CLIENT:

-   RAZÓN SOCIAL = normalized, uppercased
-   TIPO DE SOCIEDAD = dropdown, [SRL, SCO, SCS, SA, SCA, AAP, SEM, LIM, EPB, UNI, MIC, FUN, SCI, IED, ORR]
-   TIPO DE DOCUMENTO = always "NIT"
-   NIT = required, only numbers, not less than 7 digits
-   MATRICULA DE COMERCIO = optional, not less than 7 characters
-   PAIS O LUGAR DE CONSTITUCION = normalized, uppercased
-   ACTIVIDAD ECONOMICA = normalized, uppercased
-   DIRECCION DE DOMICILIO LEGAL = normalized, uppercased
-   CORREO ELECTRONICO = normalized, validated
-   TELEFONO = only numbers, not less than 5 digits

## data of at least one representante legal is required for any juridic client, cant submit form otherwise:

-   primer Nombre = normalized, uppercased
-   segundo Nombre = optional, normalized, uppercased
-   Primer apellido = normalized, uppercased
-   Segundo Apellido = optional, normalized, uppercased
-   TIPO DE DOCUMENTO = [ci, pasaporte]
-   Numero de documento = normalized, uppercased, not less than 6 characters
-   Extension = optional, normalized, uppercased

3. use the most simplified form possible for all db field names to keep it simple and easy to understand, and keep them in spanish.

I need a file upload system for the following files in the following client forms, always required unless stated otherwise:
natural client:

-   certificacion de cliente PEP [pdf file]
-   documento identidad firmado [pdf file]
-   formulario conoce a tu cliente [pdf file]
    unipersonal client:
-   certificacion de cliente PEP [pdf file]
-   documento identidad firmado [pdf file]
-   certificado de NIT [pdf file]
-   matricula de comercio [pdf file, optional]
-   formulario conoce a tu cliente [pdf file]
    juridic client:
-   certificado de NIT [pdf file]
-   matricula de comercio [pdf file, optional]
-   testimonio de constitucion social [pdf file]
-   balance general y estado de resultados [pdf file]
-   poder de representacion [pdf file]
-   documento identidad representante firmado [pdf file]
-   certificacion de cliente PEP [pdf file]
-   formulario conoce a tu cliente [pdf file]
