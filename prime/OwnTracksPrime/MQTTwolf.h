#if !defined(MQTTwolf_H)
#define MQTTwolf_H

#include "mbed.h"
#include "TCPSocketConnection.h"
#include "wolfssl/ssl.h"

static TCPSocketConnection mysock; 

static int SocketReceive(WOLFSSL* ssl, char *buf, int len, void *ctx)
{
    int rc = mysock.receive(buf, len);
    if (rc == -1)
        rc = -2;  // -2 is WANT_READ
    return rc;
}
 
static int SocketSend(WOLFSSL* ssl, char *buf, int len, void *ctx)
{
    int rc = mysock.send(buf, len);
    return rc;
}


class MQTTwolf
{
public:
    MQTTwolf()
    {
        ssl = 0;
        ctx = 0;
                
        wolfSSL_Init();
        wolfSSL_Debugging_ON();
        method = wolfTLSv1_2_client_method();
    }
    
    int connect(char* hostname, int port, int timeout=1000)
    {
        int rc = -1;
        
        if ( (ctx = wolfSSL_CTX_new(method)) == NULL)
        {
            printf("unable to get ctx");
            goto exit;
        }
        wolfSSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, 0);
        wolfSSL_SetIORecv(ctx, SocketReceive); 
        wolfSSL_SetIOSend(ctx, SocketSend);
        
        mysock.set_blocking(false, timeout);    
        if ( (rc = mysock.connect(hostname, port)) != 0)
            goto exit;
        
        if ( (ssl = wolfSSL_new(ctx)) == NULL)
        {
            printf("unable to get SSL object");
            rc = -1; goto exit;
        }   
        wolfSSL_set_using_nonblock(ssl, 1);
        if ( (rc = wolfSSL_connect(ssl)) != SSL_SUCCESS)
        {    
            rc = wolfSSL_get_error(ssl, 0);
            printf("err = %d, %s\n", rc, wolfSSL_ERR_error_string(rc, "\n"));
            printf("SSL Connection Error\n");
            rc = -1;
        }
        else
        {
            printf("SSL Connected\n") ;
            rc = 0;
        }
    exit:
        return rc;
    }

    int read(unsigned char* buffer, int len, int timeout)
    {
        int rc = 0;
                
        mysock.set_blocking(false, timeout);  
        rc = wolfSSL_read(ssl, buffer, len);
        printf("called wolfSSL_read len %d rc %d\n", len, rc);
        return rc;
    }
    
    int write(unsigned char* buffer, int len, int timeout)
    {
        int rc = 0;
        mysock.set_blocking(false, timeout);  
        rc = wolfSSL_write(ssl, buffer, len);
        printf("called wolfSSL_write len %d rc %d\n", len, rc);
        return rc;
    }
    
    int disconnect()
    {
        wolfSSL_free(ssl);
        int rc = mysock.close();
 
        wolfSSL_CTX_free(ctx) ;
        return rc;
    }
    
private:

    WOLFSSL_METHOD*  method;
    WOLFSSL_CTX*     ctx;
    WOLFSSL*         ssl;
    
};

#endif
