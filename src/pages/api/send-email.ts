
import type { APIRoute } from "astro";
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

        if (!apiKey || !turnstileSecret) {
            throw new Error("Faltan variables de entorno críticas.");
        }

        const resend = new Resend(apiKey);
        const data = await request.formData();
        
        const turnstileToken = data.get('cf-turnstile-response')?.toString();
        
        if (!turnstileToken) {
            return new Response(JSON.stringify({
                success: false,
                message: "Validación de seguridad requerida."
            }), { status: 400 });
        }

        const cfVerifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}`,
        });

        const cfVerifyResult = await cfVerifyResponse.json();

        if (!cfVerifyResult.success) {
            const errorCodes = cfVerifyResult['error-codes'] || [];
            let errorMessage = "Validación de seguridad fallida. Sistema anti-spam activado.";

            if (errorCodes.includes('timeout-or-duplicate')) {
                errorMessage = "Tu sesión ha expirado por inactividad. Por favor, recarga la página e intenta de nuevo.";
            } else if (errorCodes.includes('missing-input-response') || errorCodes.includes('invalid-input-response')) {
                errorMessage = "No se pudo verificar la prueba de seguridad. Asegúrate de tener JavaScript habilitado.";
            }

            return new Response(JSON.stringify({
                success: false,
                message: errorMessage
            }), { status: 403 });
        }

        const nombre = data.get('nombre')?.toString();
        const email = data.get('email')?.toString();
        const telefono = data.get('telefono')?.toString();
        const servicio = data.get('servicio')?.toString();
        const empresa = data.get('empresa')?.toString() || 'No especificada';

        const sanitizarTexto = (texto: string) => {
            return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        };

        const mensaje = sanitizarTexto(data.get('mensaje')?.toString() || '');

        if (!nombre || !email || !telefono || !mensaje) {
            return new Response(JSON.stringify({
                success: false,
                message: "Faltan campos obligatorios."
            }), { status: 400 });
        }

        const honeypot = data.get('fax_empresa')?.toString();
        
        if (honeypot) {
            return new Response(JSON.stringify({ 
                success: true, 
                message: "Consulta enviada." 
            }), { status: 200 }); 
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; background-color: #f1f5f9; }
                    .wrapper { width: 100%; padding: 40px 0; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .header { background-color: #0f172a; padding: 30px; text-align: center; }
                    .header h1 { color: #ffffff; font-size: 20px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
                    .content { padding: 30px; color: #1e293b; }
                    .lead-info { background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
                    .info-row { display: flex; margin-bottom: 12px; }
                    .info-label { width: 40%; font-weight: bold; color: #64748b; font-size: 14px; }
                    .info-value { width: 60%; color: #0f172a; font-size: 14px; }
                    .badge { background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
                    .message-box { background-color: #f1f5f9; padding: 20px; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; color: #475569; font-size: 14px; line-height: 1.6; }
                    .footer { background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <h1>Nuevo Lead de Consultoría Fiscal</h1>
                        </div>
                        <div class="content">
                            <p style="margin-top: 0; margin-bottom: 20px; font-size: 16px;">Se ha recibido una nueva solicitud de contacto desde la landing page. A continuación los detalles:</p>
                            
                            <div class="lead-info">
                                <p style="margin-top: 0; margin-bottom: 15px; font-weight: bold; color: #0f172a;">Información del Prospecto</p>
                                <p style="margin: 5px 0;"><strong>👤 Nombre:</strong> ${nombre}</p>
                                <p style="margin: 5px 0;"><strong>🏢 Empresa:</strong> ${empresa}</p>
                                <p style="margin: 5px 0;"><strong>📧 Email:</strong> <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></p>
                                <p style="margin: 5px 0;"><strong>📞 Teléfono:</strong> ${telefono}</p>
                                <p style="margin: 5px 0;"><strong>💼 Servicio solicitado:</strong> <span class="badge">${servicio}</span></p>
                            </div>

                            <p style="font-weight: bold; color: #0f172a; margin-bottom: 10px;">Detalles de la Situación Fiscal</p>
                            <div class="message-box">
                                ${mensaje.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                        <div class="footer">
                            Este es un correo automático generado por el sistema de J&R Consultores.
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const { error } = await resend.emails.send({
            from: 'Notificaciones Web <onboarding@mail.jyrconsultoresmx.com>',
            to: ['leads@jyrconsultoresmx.com'],
            subject: `🚀 Nuevo Prospecto: ${nombre}`,
            html: htmlContent,
        });

        if (error) {
            let errorMessage = "No pudimos enviar tu mensaje. Por favor intenta más tarde.";
            
            if (error.name === 'rate_limit_exceeded' || error.message.toLowerCase().includes('rate limit')) {
                 errorMessage = "Has enviado demasiadas solicitudes recientes. Por favor, espera un par de minutos antes de volver a intentar.";
                 return new Response(JSON.stringify({
                    success: false,
                    message: errorMessage
                }), { status: 429 });
            }

            throw new Error(errorMessage);
        }

        return new Response(JSON.stringify({
            success: true,
            message: "¡Consulta enviada con éxito!"
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: error instanceof Error ? error.message : 'Error desconocido'
        }), { status: 500 });
    }
}