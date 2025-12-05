import axios from 'axios';

export const sendInviteEmail = async (req, res) => {
  const { email, subject } = req.body;
  const inviteLink = "http://localhost:4200/auth";

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const emailHTML = `
      <html>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #28443F; color: #fff; text-align: center; padding: 30px;">
                      <h1 style="margin:0; font-size: 28px;">ProjectHub</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px; color: #333; line-height: 1.6;">
                      <p style="font-size: 16px;">
                        You’ve been invited to join <strong>ProjectHub</strong>, the platform to manage all your projects efficiently.
                      </p>
                      <p style="text-align:center; margin: 30px 0;">
                        <a href="${inviteLink}" style="background-color: #F2FD7D; color: #28443F; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold;">
                          Accept Invite
                        </a>
                      </p>
                      <p style="font-size: 14px; color: #777;">
                        If you didn’t expect this email, you can safely ignore it.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f0f0f0; text-align: center; padding: 20px; font-size: 12px; color: #555;">
                      &copy; ${new Date().getFullYear()} ProjectHub. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'ProjectHub',
          email: 'cloudsynktech@gmail.com', // Verified sender
        },
        to: [
          {
            email: email,
            name: email.split('@')[0] || 'User', // Use part before @ as placeholder
          }
        ],
        subject: subject || 'You are invited to ProjectHub!',
        htmlContent: emailHTML
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        }
      }
    );

    console.log('Invite email sent:', response.data);
    return res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('Error sending invite:', error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
};
