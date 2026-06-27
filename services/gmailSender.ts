const getBase64String = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface EmailAttachment {
  fileName: string;
  blob: Blob;
}

export const sendEmailWithAttachments = async (
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  attachments: EmailAttachment[]
): Promise<void> => {
  const boundary = `boundary_work_diary_generator_${Date.now()}`;
  
  // Construct MIME headers and body parts
  let rawMime = '';
  rawMime += `MIME-Version: 1.0\r\n`;
  rawMime += `To: ${to}\r\n`;
  
  // RFC 2047 Base64 encoding for Subject to support arbitrary characters
  const base64Subject = btoa(unescape(encodeURIComponent(subject)));
  rawMime += `Subject: =?utf-8?B?${base64Subject}?=\r\n`;
  rawMime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
  
  // Body part
  rawMime += `--${boundary}\r\n`;
  rawMime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
  rawMime += `Content-Transfer-Encoding: base64\r\n\r\n`;
  
  const base64Body = btoa(unescape(encodeURIComponent(bodyText)));
  rawMime += `${base64Body}\r\n\r\n`;
  
  // Attachments
  for (const att of attachments) {
    const base64Content = await getBase64String(att.blob);
    rawMime += `--${boundary}\r\n`;
    rawMime += `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="${att.fileName}"\r\n`;
    rawMime += `Content-Disposition: attachment; filename="${att.fileName}"\r\n`;
    rawMime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    rawMime += `${base64Content}\r\n\r\n`;
  }
  
  rawMime += `--${boundary}--`;
  
  // Encode the final standard MIME body to base64url safe format
  const encodedMail = btoa(rawMime)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedMail
    })
  });
  
  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Gmail API failed to send email: ${response.statusText} (${errorDetails})`);
  }
};
