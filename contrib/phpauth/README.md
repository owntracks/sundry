PHP < 5.5.0 Authentication based on https://defuse.ca/php-pbkdf2.htm

PHP include file to be used with mosquitto-auth-plug password standards of generationg and checking passwords.

functions:

```
create_hash(password, iterations);
```
You could send secondary parameter for how meny iterations to be made before giving the hash.

DEFAULT is 901 (number given in np)

returns password hash.

Create PBKDF2 password hashe with mosquitto-auth-plug compatability

```
validate_password(password, valid_hash);

```


Returns true or false.

Checks password against DB saved one.


This is derivative work based on the original php-pbkdf2 - https://defuse.ca/php-pbkdf2.htm

I have no claim for original work - I've just modified the code to provide password HASHes compatable
with mosquitto-auth-plug.


```
The following code is a PBKDF2 implementation in PHP. It is in the public domain, 
so feel free to use it for any purpose whatsoever. It complies with the PBKDF2 test 
vectors in RFC 6070. Performance improvements to the original code were provided by 
variations-of-shadow.com.
```
