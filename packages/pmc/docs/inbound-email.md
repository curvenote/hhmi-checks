---
title: Inbound email
subtitle: Exploring the formats of emails received during the overall deposit process
---

Tune in the PMC workflow, there are a number of points which emails are received or could potentially be received and are also sent. We're going to document those interactions here.

# PMC Workflow

The PMC Workflow is codified [here](../workflows.ts). It consists of the following major steps:

```{literalinclude} ../workflows.ts
:filename: pmc/workflows.ts
:linenos:
:start-line: 3
:end-line: 16
```

Inbound e-mails are by the system after:

DEPOSITED
: Based on the email registered with NIHMS, the system will receive either success, warning, or error emails back regarding each individual deposit that is processed.

REVIEWER_APPROVED_INTIIAL
: Based On the reviewer email details supplied within deposit metadata, the system should receive an email requesting initial review and approval by the reviewer.

NIHMS also sends emails to the agency admins[^admins] during the PMC overall deposit process, that are available to HHMI within an "Adminstration Inbox" on the NIHMS portal.

[^admins]: We are going to confirm details of where there are sent to, and understand whether we can intercept

These email are sent at:

# Deposited

The automated emails that come back at this stage are quite minimal.

## Success

### Example 1

:::{figure} ./bulk-success-errors-1.png
:::

```
From: nihms-help@ncbi.nlm.nih.gov <nihms-help@ncbi.nlm.nih.gov>
Date: Monday, September 9, 2024 at 5:00 PM
To: pmc-deposit <pmc-deposit@hhmi.org>, smith2@ncbi.nlm.nih.gov <smith2@ncbi.nlm.nih.gov>, bourexis@ncbi.nlm.nih.gov <bourexis@ncbi.nlm.nih.gov>
Subject: Bulk submission (errors encountered)
---
<table style="background-color:transparent;margin-bottom:20px;max-width:100%;width:100%;border-collapse:collapse" width="100%">
  <colgroup>
    <col span="1" style="width:50px">
    <col span="1">
  </colgroup>
  <tbody>

    <tr style="page-break-inside:avoid">
      <td style="border:0 solid #000;border-radius:0.25em;color:#fff;font-size:75%;font-weight:bold;line-height:1.428571;padding:8px;text-align:center;vertical-align:top;white-space:nowrap;background-color:#5bc0de;border-top:1px solid #ddd" align="center" valign="top" bgcolor="#5bc0de">INFO</td>
      <td style="border-top:1px solid #ddd;line-height:1.428571;padding:8px;vertical-align:top" valign="top">Package ID=19787d192c7-7007-e972-076d-<wbr>1fb4654119 for Manuscript ID 1502645 was submitted successfully.</td>
    </tr>

  </tbody>
</table>
```

#### Webhook JSON Payload

```json
{
  "headers": {
    "received": "by mail-vk1-f172.google.com with SMTP id 71dfb90a1353d-53169549df9so569460e0c.1        for <e8ed92208ee6393951e7@cloudmailin.net>; Thu, 19 Jun 2025 08:25:12 -0700",
    "date": "Thu, 19 Jun 2025 16:25:00 +0100",
    "from": "Steve Purves <steve@curvenote.com>",
    "reply_to": "steve@curvenote.com",
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "message_id": "<CAJfCryRNNKoC2fZ7jUnxYWJzQiAEQdydFrjayt=FMjsKtwA7Wg@mail.gmail.com>",
    "in_reply_to": "<175034160863.65.11693519603490119905@512fd3415c9b>",
    "references": "<175034160863.65.11693519603490119905@512fd3415c9b>",
    "subject": "Fwd: Bulk submission success",
    "mime_version": "1.0",
    "content_type": "multipart/alternative; boundary=000000000000f9ed480637ee5954",
    "dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=curvenote-com.20230601.gappssmtp.com; s=20230601; t=1750346711; x=1750951511; darn=cloudmailin.net;        h=to:subject:message-id:date:from:reply-to:in-reply-to:references         :mime-version:from:to:cc:subject:date:message-id:reply-to;        bh=NXrLG+fLo1oPQoHkb9nbbiMSLI3FoxjUEqR8x8gd+7A=;        b=BAh0BX2P54Jd2OknhJz9BFzArR3VaVdAybuBWeuU3gW6U7Y7BroewtbuEyb92VKXmM         sG02o8mCzJGueergCkpi5j5+KRuKc1BrDBHpTcBQGh9MLribbu3duKFVxx41utN4uh3P         u1tCk4zrSQEEEVEpISq6Eoqxm3YAJsB8gGkIVCBgIxiPC8UOf+fESC5RYQkHWfolEomz         d0l4/LGV0ZTJjPscglo2QCxBouSZ9Gc2hi43OLjlo7Lnorf664BWh1VjE2WmfujPqV2e         hyEa3iHJXqTfLjkmAxlsUqBfoXbMpSqNPv3BM8DrYC68bdZXTg5tWEVcrw2iN/Lndvik         bsNA==",
    "x_google_dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=1e100.net; s=20230601; t=1750346711; x=1750951511;        h=to:subject:message-id:date:from:reply-to:in-reply-to:references         :mime-version:x-gm-message-state:from:to:cc:subject:date:message-id         :reply-to;        bh=NXrLG+fLo1oPQoHkb9nbbiMSLI3FoxjUEqR8x8gd+7A=;        b=VhNMHNO2u7O1xkiO48L0uf9Dc9HOnOTxT2YRHpAmDrWZVDG3yCBq++FAgHbGMy3BxH         so0l9Lkmq5b3WAjokSYO9MApqMEaBaU/U2UO3Yq14RH3so5B7L3cT1Uwjf81ILC3ZfJZ         dmhhKlo1qbTcU7Xm8oNWi5nk2MWVwn/hclgfiQPNj1FQXYWHNQ1Vrygeq3pkVUzUCUVm         KcaathTGodINpeILFAYdfYpJfKnPYrFb+ZuZD1tRBP3VuTGYU5fLfMZuIEL3vpkX62bW         kO8S5lSRHzK2kPYfnHiIYpJxos8ySO9clVIFE+pTnt1DAQtMnYAY9GvzN1F5ESlkYZ0q         0ytA==",
    "x_gm_message_state": "AOJu0YxZF80XkjjeUzs9lBL3l4Z5YLbsqEgOFMcXNGjAV+NIcXBbBHy1\tP7YMoSDJ16ujmIO5pgSIsP1a9sTE6AXxRCW/vLArEdD52pBOstMJDLh7ARsOBmSg7wTtbqmX2Jj\t1IaPFNtqx2LHxCCZVd52FDRx5YfMv5PsUrVWHdCKKoRr9rxKuVqPnx6w=",
    "x_gm_gg": "ASbGncv+y9iTOPoXtEIMq99fltHjd0bAJdQpS7TvNhuzrFT82+RUU0r7TRra54LoaqJ\t+yfsl9HjbZRfockT0z/Ttmk9jGVnCgzHMG5uufeWWAwVLuHJSxJcIRkB/Aq1JRe0JM1Ap/UdIjP\tvbUJFwzo4De5d01oL87N3+9JhoGBYgEqUlGDRNJBxa0g==",
    "x_google_smtp_source": "AGHT+IHe9cXyw4Gl2G1FYhZxfXAP2aKeWerRAfgrQwPm0EaqEiK9EkDQCdiGewzq3Zw6TLCpB7q+V3SpAm7JsdCU1lg=",
    "x_received": "by 2002:a05:6122:370d:b0:530:6955:1889 with SMTP id 71dfb90a1353d-531493b59f0mr14273232e0c.1.1750346711551; Thu, 19 Jun 2025 08:25:11 -0700 (PDT)",
    "x_gm_features": "Ac12FXzrW_1s9QBr2N0hT_IYInyJSv_O13eOzVkZXJ1k8tXJ5ziOn6c-LftaqeQ"
  },
  "envelope": {
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "recipients": ["e8ed92208ee6393951e7@cloudmailin.net"],
    "from": "steve@curvenote.com",
    "helo_domain": "mail-vk1-f172.google.com",
    "remote_ip": "209.85.221.172",
    "tls": true,
    "tls_cipher": "TLSv1.3",
    "md5": "319d47c5ea92106111d876a3e2e698ee",
    "spf": {
      "result": "pass",
      "domain": "curvenote.com"
    }
  },
  "plain": "INFO Package ID=19787d192c7-7007-e972-076d-1fb4654119 for Manuscript ID\r\n1502645 was submitted successfully.\r\n���\r\n",
  "html": "<div dir=\"ltr\"><div class=\"gmail_quote gmail_quote_container\"><br>\r\n\r\n  \r\n  \r\n  \r\n  \r\n<div style=\"font-family:&quot;Helvetica Neue&quot;,Helvetica,Arial,sans-serif\">\r\n    <table style=\"background-color:transparent;margin-bottom:20px;max-width:100%;width:100%;border-collapse:collapse\" width=\"100%\">\r\n      <colgroup>\r\n        <col span=\"1\" style=\"width:50px\">\r\n        <col span=\"1\">\r\n      </colgroup>\r\n      <tbody>\r\n        \r\n        <tr style=\"page-break-inside:avoid\">\r\n          <td style=\"border:0 solid #000;border-radius:0.25em;color:#fff;font-size:75%;font-weight:bold;line-height:1.428571;padding:8px;text-align:center;vertical-align:top;white-space:nowrap;background-color:#5bc0de;border-top:1px solid #ddd\" align=\"center\" valign=\"top\" bgcolor=\"#5bc0de\">INFO</td>\r\n          <td style=\"border-top:1px solid #ddd;line-height:1.428571;padding:8px;vertical-align:top\" valign=\"top\">Package ID=19787d192c7-7007-e972-076d-1fb4654119 for Manuscript ID 1502645 was submitted successfully.</td>\r\n        </tr>\r\n        \r\n      </tbody>\r\n    </table>\r\n</div>\r\n\r\n</div></div><div hspace=\"streak-pt-mark\" style=\"max-height:1px\"><img alt=\"\" style=\"width:0px;max-height:0px;overflow:hidden\" src=\"https://mailfoogae.appspot.com/t?sender=ac3RldmVAY3VydmVub3RlLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=f1e1afa0-ad09-4f9d-a974-fd34934c2d7f\"><font color=\"#ffffff\" size=\"1\">���</font></div>\r\n",
  "reply_plain": null,
  "attachments": []
}
```

## Errors

### Example 1

:::{figure} ./bulk-deposit-errors-1.png
:::

```
From: nihms-help@ncbi.nlm.nih.gov <nihms-help@ncbi.nlm.nih.gov>
Date: Monday, September 9, 2024 at 5:00 PM
To: pmc-deposit <pmc-deposit@hhmi.org>, smith2@ncbi.nlm.nih.gov <smith2@ncbi.nlm.nih.gov>, bourexis@ncbi.nlm.nih.gov <bourexis@ncbi.nlm.nih.gov>
Subject: Bulk submission (errors encountered)
---

<div>
<table border="1" cellspacing="0" cellpadding="0" align="left">
<tbody>
<tr>
<td width="100%" style="width:100.0%;padding:3.0pt 3.0pt 3.0pt 3.0pt">
<p class="MsoNormal">
<b><span style="font-family:&quot;Arial&quot;,sans-serif;color:red">External Email: Use Caution</span></b><u></u><u></u></p>
</td>
</tr>
</tbody>
</table>
<p class="MsoNormal" style="margin-bottom:12.0pt"><span style="font-family:&quot;Helvetica Neue&quot;"><u></u>&nbsp;<u></u></span></p>
</div>

<table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100.0%;border-collapse:collapse;max-width:100%">
<tbody>
<tr style="page-break-inside:avoid">
<td nowrap="" valign="top" style="border:solid black 1.0pt;border-top:solid #dddddd 1.0pt;background:#d9534f;padding:6.0pt 6.0pt 6.0pt 6.0pt;border-radius:0.25em">
<p class="MsoNormal" align="center" style="margin-bottom:15.0pt;text-align:center">
<b><span style="font-size:9.0pt;color:white">ERROR<u></u><u></u></span></b></p>
</td>
<td valign="top" style="border:none;border-top:solid #dddddd 1.0pt;padding:6.0pt 6.0pt 6.0pt 6.0pt">
<p class="MsoNormal" style="margin-bottom:15.0pt">Package ID=621b52177f5f8 failed because of the following meta XML validation error: &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>CONTENT_MODEL: Element manuscript-submit content does not follow the DTD, expecting (journal-meta
 , manuscript-title , citation? , contacts , grants? , permissions? , disclaimer? , custom-meta-group?), got (manuscript-title journal-meta contacts grants URL) &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>UNKNOWN_ATTRIBUTE: No declaration for attribute embargoMonths of element
 manuscript-submit &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>MISSING_ATTRIBUTE: Element issn does not carry attribute issn-type &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>UNKNOWN_ATTRIBUTE: No declaration for attribute issnType of element issn &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>MISSING_ATTRIBUTE:
 Element person does not carry attribute person-type &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>UNKNOWN_ATTRIBUTE: No declaration for attribute personType of element person &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>MISSING_ATTRIBUTE: Element URL does not carry attribute url-type &lt;string&gt;:1:0:ERROR:VALID:DTD_<wbr>UNKNOWN_ATTRIBUTE:
 No declaration for attribute urlType of element URL.<u></u><u></u></p>
</td>
</tr>
</tbody>
</table>
```

#### Webhook JSON Payload

```json
{
  "headers": {
    "received": "by mail-vk1-f174.google.com with SMTP id 71dfb90a1353d-530d764149eso14913e0c.1        for <e8ed92208ee6393951e7@cloudmailin.net>; Wed, 18 Jun 2025 13:26:12 -0700",
    "date": "Wed, 18 Jun 2025 21:26:01 +0100",
    "from": "Steve Purves <steve@curvenote.com>",
    "reply_to": "steve@curvenote.com",
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "message_id": "<CAJfCryQ748NkcmbJogWPfxKENeSJ30uBRt+bMdL7+ary3g7R6Q@mail.gmail.com>",
    "subject": "Bulk submission (errors encountered)",
    "mime_version": "1.0",
    "content_type": "multipart/alternative; boundary=0000000000009b6d520637de70bb",
    "dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=curvenote-com.20230601.gappssmtp.com; s=20230601; t=1750278372; x=1750883172; darn=cloudmailin.net;        h=to:subject:message-id:date:from:reply-to:mime-version:from:to:cc         :subject:date:message-id:reply-to;        bh=4TX4LqtSRT4mfDjarI4IKg/5mFgdmw7OiBkKCnTfx0M=;        b=JDy7D2MPTXi3uz8e+vy+/tEhBprHiaRzFkUUqDasPpPq1FPu8IkqzhvJRmXPWm1M0l         UUaQqtG6Odm81oFftCav5Jsr4i+3qRfK9Cx3J8CoaAOYAjaR1hOgNKaAWW6RyisbSvh3         ZafBRYEkvSxNLPmEDZoHTkIta2zjX2C1NtnqE6kLny+L+jmORFFCYnf1KeHEo8GBIyZy         HwW+mA/bq/hCQvHu6upE6rvPS1EnemOVCnnloV0Gt2hVqQjaVd7Mv1o8rMxxDtvVIri2         V+oMekyjhRe0xhTOY8BB+WeFo4oZ58hROxhRWVinzLEVf526bPMfVxcj8eJ0Scw5T5yj         l8YQ==",
    "x_google_dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=1e100.net; s=20230601; t=1750278372; x=1750883172;        h=to:subject:message-id:date:from:reply-to:mime-version         :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to;        bh=4TX4LqtSRT4mfDjarI4IKg/5mFgdmw7OiBkKCnTfx0M=;        b=sVZg1vQxMkfjqGqjklOvvcl82xoXj7zzRQcpiFA8m6aKqHhzd+obzrx9lTsVle6W8a         UMfrVoYqx26ssyZP7A6+6HMePVKLqZWPL6jsVL9Inq0yNXAmI8tFEPemMuLpGtiTr5om         Mzvb5dtqWBO61G1lon/YtviFPKm7FMkVUu2ZIxIIxhfb86T8YIwe58WR3qi6wOGXxd3Z         dXzMJmEkV/mbF5IQdZCpP/9P3dZRbMOjeAUq/u40A8LF+n5QOFu/mCOm42Nu2Wc8znCi         0x4/J4DORIaZngVoDfOmrD8HJKu3hgM6yhlYRGS4wLFz4Scd34mw2pJh9aoT5eDUnFch         0fGw==",
    "x_gm_message_state": "AOJu0YyJEo6wxsVd5n1viqZCqkIV6lj/xLEeX+evWuKm481tx3LIvH1Z\tcu5E7iIWp/l36uQwoPN7FLilA60bWaMZrt8APtv5wKwkOkdbjTZtNyGPUK0H1O8VaYaat1RarU3\tVppJSHAJopg2dd7YJNhhVMLdJRhUoDzrqkLuaoo8kJcgt6EWmI3GPYye+PQ==",
    "x_gm_gg": "ASbGncva2h4h2ymDQ/RpjykF0PhViuZFmKzavlOpkQZvLU1cqonIfw2nDKB1/FvmJNl\tAlMNqP65XAfGqVuCgwoteA9e3dsFNinTLyXDCSE56M13hSKOquV1vrw1Wt09uKozGKumhVGid0S\tt4kH1PrdD2begksgkfiyrQtM4aoqsNqQiK6YS5yW2COg==",
    "x_google_smtp_source": "AGHT+IEOTnNpf1jx6+N0n/AyNK4aBkIZPeH/QgUZCRgbTfI5nPUUX/AGpAIjaLjUHeQFE0mnI7LEKAZ6erZm8VMi/L8=",
    "x_received": "by 2002:a05:6122:1d86:b0:520:af9c:c058 with SMTP id 71dfb90a1353d-531495f865dmr13700895e0c.5.1750278371759; Wed, 18 Jun 2025 13:26:11 -0700 (PDT)",
    "x_gm_features": "Ac12FXykVfzTm39sSdp81r1jQ_HHfmM84-M-pNniwxG6Sh7ZlJOMsc3Jq3V5eyY"
  },
  "envelope": {
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "recipients": ["e8ed92208ee6393951e7@cloudmailin.net"],
    "from": "steve@curvenote.com",
    "helo_domain": "mail-vk1-f174.google.com",
    "remote_ip": "209.85.221.174",
    "tls": true,
    "tls_cipher": "TLSv1.3",
    "md5": "4eaf743c27d61f7574816afd334d9042",
    "spf": {
      "result": "pass",
      "domain": "curvenote.com"
    }
  },
  "plain": "*External Email: Use Caution*\r\n\r\n\r\n\r\n*ERROR*\r\n\r\nPackage ID=621b52177f5f8 failed because of the following meta XML\r\nvalidation error: <string>:1:0:ERROR:VALID:DTD_CONTENT_MODEL: Element\r\nmanuscript-submit content does not follow the DTD, expecting (journal-meta\r\n, manuscript-title , citation? , contacts , grants? , permissions? ,\r\ndisclaimer? , custom-meta-group?), got (manuscript-title journal-meta\r\ncontacts grants URL) <string>:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No\r\ndeclaration for attribute embargoMonths of element manuscript-submit\r\n<string>:1:0:ERROR:VALID:DTD_MISSING_ATTRIBUTE: Element issn does not carry\r\nattribute issn-type <string>:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No\r\ndeclaration for attribute issnType of element issn\r\n<string>:1:0:ERROR:VALID:DTD_MISSING_ATTRIBUTE: Element person does not\r\ncarry attribute person-type <string>:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE:\r\nNo declaration for attribute personType of element person\r\n<string>:1:0:ERROR:VALID:DTD_MISSING_ATTRIBUTE: Element URL does not carry\r\nattribute url-type <string>:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No\r\ndeclaration for attribute urlType of element URL.\r\n\r\n\r\nᐧ\r\n",
  "html": "<div dir=\"ltr\"><div><p class=\"MsoNormal\" style=\"margin-bottom:12pt\"><br></p><table border=\"1\" cellspacing=\"0\" cellpadding=\"0\" align=\"left\"><tbody><tr><td width=\"100%\" style=\"width:173.383px;padding:3pt\"><p class=\"MsoNormal\"><b><span style=\"font-family:Arial,sans-serif;color:red\">External Email: Use Caution</span></b><u></u><u></u></p></td></tr></tbody></table><p class=\"MsoNormal\" style=\"margin-bottom:12pt\"><span style=\"font-family:&quot;Helvetica Neue&quot;\"><u></u> </span></p></div><table border=\"0\" cellspacing=\"0\" cellpadding=\"0\" width=\"100%\" style=\"width:593px;border-collapse:collapse;max-width:100%\"><tbody><tr style=\"break-inside:avoid\"><td nowrap valign=\"top\" style=\"border-width:1pt;border-style:solid;border-color:rgb(221,221,221) black black;background:rgb(217,83,79);padding:6pt;border-radius:0.25em\"><p class=\"MsoNormal\" align=\"center\" style=\"margin-bottom:15pt;text-align:center\"><b><span style=\"font-size:9pt;color:white\">ERROR<u></u><u></u></span></b></p></td><td valign=\"top\" style=\"border-right:none;border-bottom:none;border-left:none;border-top:1pt solid rgb(221,221,221);padding:6pt\"><p class=\"MsoNormal\" style=\"margin-bottom:15pt\">Package ID=621b52177f5f8 failed because of the following meta XML validation error: &lt;string&gt;:1:0:ERROR:VALID:DTD_CONTENT_MODEL: Element manuscript-submit content does not follow the DTD, expecting (journal-meta , manuscript-title , citation? , contacts , grants? , permissions? , disclaimer? , custom-meta-group?), got (manuscript-title journal-meta contacts grants URL) &lt;string&gt;:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No declaration for attribute embargoMonths of element manuscript-submit &lt;string&gt;:1:0:ERROR:VALID:DTD_MISSING_ATTRIBUTE: Element issn does not carry attribute issn-type &lt;string&gt;:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No declaration for attribute issnType of element issn &lt;string&gt;:1:0:ERROR:VALID:DTD_MISSING_ATTRIBUTE: Element person does not carry attribute person-type &lt;string&gt;:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No declaration for attribute personType of element person &lt;string&gt;:1:0:ERROR:VALID:DTD_MISSING_ATTRIBUTE: Element URL does not carry attribute url-type &lt;string&gt;:1:0:ERROR:VALID:DTD_UNKNOWN_ATTRIBUTE: No declaration for attribute urlType of element URL.<u></u><u></u></p></td></tr></tbody></table><p class=\"MsoNormal\"><u></u> </p></div><div hspace=\"streak-pt-mark\" style=\"max-height:1px\"><img alt=\"\" style=\"width:0px;max-height:0px;overflow:hidden\" src=\"https://mailfoogae.appspot.com/t?sender=ac3RldmVAY3VydmVub3RlLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=ccb52dfa-6337-41e7-abbd-bec999b8f84d\"><font color=\"#ffffff\" size=\"1\">ᐧ</font></div>\r\n",
  "reply_plain": null,
  "attachments": []
}
```

### Example 2

:::{figure} ./bulk-deposit-errors-2.png
:::

```
From: nihms-help@ncbi.nlm.nih.gov <nihms-help@ncbi.nlm.nih.gov>
Date: Tuesday, September 10, 2024 at 7:00 PM
To: pmc-deposit <pmc-deposit@hhmi.org>, smith2@ncbi.nlm.nih.gov <smith2@ncbi.nlm.nih.gov>, bourexis@ncbi.nlm.nih.gov <bourexis@ncbi.nlm.nih.gov>
Subject: Bulk submission (errors encountered)

<div>
<table border="1" cellspacing="0" cellpadding="0" align="left">
<tbody>
<tr>
<td width="100%" style="width:100.0%;padding:3.0pt 3.0pt 3.0pt 3.0pt">
<p class="MsoNormal">
<b><span style="font-family:&quot;Arial&quot;,sans-serif;color:red">External Email: Use Caution</span></b><u></u><u></u></p>
</td>
</tr>
</tbody>
</table>
<p class="MsoNormal" style="margin-bottom:12.0pt"><span style="font-family:&quot;Helvetica Neue&quot;"><u></u>&nbsp;<u></u></span></p>
</div>

<table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100.0%;border-collapse:collapse;max-width:100%">
<tbody>
<tr style="page-break-inside:avoid">
<td nowrap="" valign="top" style="border:solid black 1.0pt;border-top:solid #dddddd 1.0pt;background:#d9534f;padding:6.0pt 6.0pt 6.0pt 6.0pt;border-radius:0.25em">
<p class="MsoNormal" align="center" style="margin-bottom:15.0pt;text-align:center">
<b><span style="font-size:9.0pt;color:white">ERROR<u></u><u></u></span></b></p>
</td>
<td valign="top" style="border:none;border-top:solid #dddddd 1.0pt;padding:6.0pt 6.0pt 6.0pt 6.0pt">
<p class="MsoNormal" style="margin-bottom:15.0pt">Package ID=191e0b4fc0b was not submitted because the following validation error occurred: {"code": "ValidationError", "detail": {"journal_title": "Field is required"}}.<u></u><u></u></p>
</td>
</tr>
</tbody>
</table>

```

#### Webhook JSON Payload

```json
{
  "headers": {
    "received": "by mail-vs1-f44.google.com with SMTP id ada2fe7eead31-4e8088896b7so28270137.1        for <e8ed92208ee6393951e7@cloudmailin.net>; Wed, 18 Jun 2025 13:26:58 -0700",
    "date": "Wed, 18 Jun 2025 21:26:46 +0100",
    "from": "Steve Purves <steve@curvenote.com>",
    "reply_to": "steve@curvenote.com",
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "message_id": "<CAJfCryQjqa2pXNEz43rQbsPU5DZf=nkMjRGSVprBPc3WVAt3Xw@mail.gmail.com>",
    "subject": "Bulk submission (errors encountered)",
    "mime_version": "1.0",
    "content_type": "multipart/alternative; boundary=0000000000005d655a0637de737b",
    "dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=curvenote-com.20230601.gappssmtp.com; s=20230601; t=1750278418; x=1750883218; darn=cloudmailin.net;        h=to:subject:message-id:date:from:reply-to:mime-version:from:to:cc         :subject:date:message-id:reply-to;        bh=2xQ/8MTVUVMfLIwhi07HiKz1Ee1UpUGI7ERv2CGQlx8=;        b=u/jndxmjvcqm3CNcYBnAk7uHbIrQG+6NeRgT68hQxZ3rsqCz5qeNZkiqGTB6z+2mDd         GogWBcoMMmV7d3PliIwZ3QuS3xMzHcmp1pPSFWEuU5SXjGtd3UhpJd6rrIRqh5ypCPWE         nu2V7kEcO2CVFvaI1TNUQbDT6/jmHmZ5fgNk72LrvRxNsjsVwM/QPL8T5AKvoV+vajE0         0nbwgNdKMtJ5HCnSzDCbSeYTlN0RfC7p0vY21lV+B2upg9j0P5uUwCEdoaSP5UAWvDAC         4kNc+eOgPIhJOJcsrQjcIM5kU1KK1ZR0mBoL9b4gm/SjzbESsimaHkfmRCAqWRqN+tpC         YZCQ==",
    "x_google_dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=1e100.net; s=20230601; t=1750278418; x=1750883218;        h=to:subject:message-id:date:from:reply-to:mime-version         :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to;        bh=2xQ/8MTVUVMfLIwhi07HiKz1Ee1UpUGI7ERv2CGQlx8=;        b=m4tSjeLKcSNXtRXTIU0lNfH9hJYtZNF5DsUjmO8V3miYzV57kHhG3qw+PDXz7KjWRL         seeVxArObDyz/keoX4XOIg6t/cluNXzXIrTY6xSqBhLHzJYRamNsxSyE+XQihD0JE3Tr         EjhM8+IvU8yypI5dqSXgIZJoUIopSxoduajbM9fgLXqYidHxTnvfgIvfisGTg596JBkY         ILFXUE3pvpnTli3w+ot07gVZad0ciW5GUVzS2htjrksYMYQh4xKhxS//jwXgmiLEXmdy         LlVpYrGkk1BaEUTVfoDwhiXLr7FACVUM49xsRJEu4Tx094+SmazmZzTlQsMa6TOqTboM         3tWg==",
    "x_gm_message_state": "AOJu0YxLvlRUL5AJILdBPWTdqlOIt6+6g9M4NCy21mkIbrNq5dhRoyLY\tYx+81Ezt66d/5njquqW1cSUhiudlSEhUIHe22a0wjDNTKgN4MKTIlIUSXrtz/2AHskvBJQ4f9VN\tN7Czxp81jxHzefvEvxUptueRusop1lltUamJURlJQzB1eIQoGtWL+DGXbfg==",
    "x_gm_gg": "ASbGncvJLQwa/DN+mqmaKmhU5EBGzcvNbXrpN608nd8hmoBbir8yQJK+272IroZFf1i\tsfv1rS5AJ82g8cuSLLe/CNQEIcoJ4NQkuYUN7IftP9lW4VAdUq8vAtccFGJdUm2yCbaJU0oiain\toKuYuTKzLxndrq5AGfVfgsrCZOZx8AwOA2sim5RuivVA==",
    "x_google_smtp_source": "AGHT+IFFprlS48bfznq6AZ2Y+pfc2qGfmIyhnhqguPjHuDOrEDRBMu1e0uWrZ+qOqVJzSmevWo2hvxoddNj3xTeyev0=",
    "x_received": "by 2002:a67:e70a:0:b0:4e9:963f:286a with SMTP id ada2fe7eead31-4e9ace3fdf5mr1219491137.5.1750278418026; Wed, 18 Jun 2025 13:26:58 -0700 (PDT)",
    "x_gm_features": "Ac12FXwWDzohhZj-Sfb09OE3aw7dsTxSHrd3U_NYjp5u-lgyNrzuutdOkR5V9R4"
  },
  "envelope": {
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "recipients": ["e8ed92208ee6393951e7@cloudmailin.net"],
    "from": "steve@curvenote.com",
    "helo_domain": "mail-vs1-f44.google.com",
    "remote_ip": "209.85.217.44",
    "tls": true,
    "tls_cipher": "TLSv1.3",
    "md5": "1a8da6836c594a44c6876fcd36384609",
    "spf": {
      "result": "pass",
      "domain": "curvenote.com"
    }
  },
  "plain": "*External Email: Use Caution*\r\n\r\n\r\n\r\n*ERROR*\r\n\r\nPackage ID=191e0b4fc0b was not submitted because the following validation\r\nerror occurred: {\"code\": \"ValidationError\", \"detail\": {\"journal_title\":\r\n\"Field is required\"}}.\r\n\r\n\r\n\r\n���\r\n",
  "html": "<div dir=\"ltr\"><div><div><table border=\"1\" cellspacing=\"0\" cellpadding=\"0\" align=\"left\"><tbody><tr><td width=\"100%\" style=\"width:173.383px;padding:3pt\"><p class=\"MsoNormal\"><b><span style=\"font-family:Arial,sans-serif;color:red\">External Email: Use Caution</span></b><u></u><u></u></p></td></tr></tbody></table><p class=\"MsoNormal\" style=\"margin-bottom:12pt\"><span style=\"font-family:&quot;Helvetica Neue&quot;\"><u></u>��<u></u></span></p></div><table border=\"0\" cellspacing=\"0\" cellpadding=\"0\" width=\"100%\" style=\"width:593px;border-collapse:collapse;max-width:100%\"><tbody><tr style=\"break-inside:avoid\"><td nowrap valign=\"top\" style=\"border-width:1pt;border-style:solid;border-color:rgb(221,221,221) black black;background:rgb(217,83,79);padding:6pt;border-radius:0.25em\"><p class=\"MsoNormal\" align=\"center\" style=\"margin-bottom:15pt;text-align:center\"><b><span style=\"font-size:9pt;color:white\">ERROR<u></u><u></u></span></b></p></td><td valign=\"top\" style=\"border-right:none;border-bottom:none;border-left:none;border-top:1pt solid rgb(221,221,221);padding:6pt\"><p class=\"MsoNormal\" style=\"margin-bottom:15pt\">Package ID=191e0b4fc0b was not submitted because the following validation error occurred: {&quot;code&quot;: &quot;ValidationError&quot;, &quot;detail&quot;: {&quot;journal_title&quot;: &quot;Field is required&quot;}}.<u></u><u></u></p></td></tr></tbody></table><p class=\"MsoNormal\"><u></u>��</p></div><div><br></div></div><div hspace=\"streak-pt-mark\" style=\"max-height:1px\"><img alt=\"\" style=\"width:0px;max-height:0px;overflow:hidden\" src=\"https://mailfoogae.appspot.com/t?sender=ac3RldmVAY3VydmVub3RlLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=c93c269a-ab92-471a-9d3f-010a3f3ea1cb\"><font color=\"#ffffff\" size=\"1\">���</font></div>\r\n",
  "reply_plain": null,
  "attachments": []
}
```

## Warnings

These are non fatal and could be regarded as success + follow up action

### Example 1

:::{figure} ./bulk-deposit-warning-1.png
:::

```
From: NLM NCBI nihms-help <nihms-help@ncbi.nlm.nih.gov>
Date: Thursday, September 12, 2024 at 07:00
To: pmc-deposit@hhmi.org <pmc-deposit@hhmi.org>, Smith, Pierce (NIH/NLM/NCBI) [E] <smith2@ncbi.nlm.nih.gov>, Bourexis, Devon (NIH/NLM/NCBI) [E] <devon.bourexis@nih.gov>
Subject: Bulk submission (errors encountered)

<table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100.0%;border-collapse:collapse;max-width:100%">
<tbody>
<tr style="page-break-inside:avoid">
<td nowrap="" valign="top" style="border:solid black 1.0pt;border-top:solid #dddddd 1.0pt;background:#f0ad4e;padding:6.0pt 6.0pt 6.0pt 6.0pt;border-radius:0.25em">
<p class="MsoNormal" align="center" style="margin-bottom:15.0pt;text-align:center">
<b><span style="font-size:9.0pt;color:white">WARNING<u></u><u></u></span></b></p>
</td>
<td valign="top" style="border:none;border-top:solid #dddddd 1.0pt;padding:6.0pt 6.0pt 6.0pt 6.0pt">
<p class="MsoNormal" style="margin-bottom:15.0pt"><span style="font-size:12.0pt">Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): "Grant 5R33MH125126-04 was not found. Please confirm that this is a valid
 award from Authority and contact the Help Desk for assistance.".<u></u><u></u></span></p>
</td>
</tr>
</tbody>
</table>
```

#### Webhook JSON Payload

```json
{
  "headers": {
    "received": "by mail-vk1-f182.google.com with SMTP id 71dfb90a1353d-530d764149eso15392e0c.1        for <e8ed92208ee6393951e7@cloudmailin.net>; Wed, 18 Jun 2025 13:27:44 -0700",
    "date": "Wed, 18 Jun 2025 21:27:32 +0100",
    "from": "Steve Purves <steve@curvenote.com>",
    "reply_to": "steve@curvenote.com",
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "message_id": "<CAJfCryRY7G4D1FB5Gif7SkVtVTFp2d7DySWNfUg5x6N1nJYAaw@mail.gmail.com>",
    "subject": "Bulk submission (errors encountered)",
    "mime_version": "1.0",
    "content_type": "multipart/alternative; boundary=0000000000001412300637de76ae",
    "dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=curvenote-com.20230601.gappssmtp.com; s=20230601; t=1750278463; x=1750883263; darn=cloudmailin.net;        h=to:subject:message-id:date:from:reply-to:mime-version:from:to:cc         :subject:date:message-id:reply-to;        bh=s8QEthauzYgtKUWMDflDI2JqmEzXwACoxGi90znFHU8=;        b=VQX02dImWVrsNa6fUHGyyrin1NsdwMSTXm2ZGmWkwTW0fTyOskf+rL79/czMG+Ux3Q         w8BldTICvlB7M/pzbNLRUM8Zu9wtckkd6upzOqk5w7YhSelHs20iYyaBgocaHvs+7bpL         hWoJZO7wl0wG/JhjMNNeiE0YWyWlMNGIFv+A6erHFcxiSrSYbmTdEtwWsUOehStS4lV/         KDsNXvpENZpYEz+usIxEYg2fyZslMabWt5DtU+ov3fxdZ4kgyDSdA48fGv0cqAXgC9F6         GeHzMcafUNmIe1t5qqZ51aeYwaLQ2LHM61ULOXdrKiMaOLPGb8eO6W0GEzsw++8ftAaJ         JcrQ==",
    "x_google_dkim_signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=1e100.net; s=20230601; t=1750278463; x=1750883263;        h=to:subject:message-id:date:from:reply-to:mime-version         :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to;        bh=s8QEthauzYgtKUWMDflDI2JqmEzXwACoxGi90znFHU8=;        b=E1wsZ3h9WhPnJi/jB3BUG15RCwuUonOUB1e8DPKOAmPgfK3DzELEAFL1kHOMTrdlMv         1pb8IBQqvoERJeUuggETGM6zVdZRBS4Y78ETMzPmwWIhpavS9Kb904mPqV9e2sZQPcsq         TxerURZMcdvlhKhZPZN585knhHhKx142DIWT+aR8ObluHhsJ6wSXWoJtcKwxZg9XWNYm         fhmZDPg6wwrlcaX+5pORHrP/MNGvPn+6tEXmGRCSx/Dlr/S/2bUI15ICIbwB5Qv7aEH9         /JoB2/G6LofUjmYeqMcLA9UW8QkLGGX8vnVOkcM55l4R0xoJo7VxMDoVO5fRL7QT/Nvo         wuPg==",
    "x_gm_message_state": "AOJu0YxZkeLt6W5MPlLYwNaPff2/jpPK0fel0/sPkjovzCHpIabb/MLy\tXuaeTHlhETdYfxTTPlTSLs42xaL/5SnNrpEDBHnyFv1GId7lTQPnJatp1g/vNpEnJu+bzkV6yzo\tTbU6mlMxV2U6PLs/mg6Vk++Ra0qRel6B4fUrlpjrONzogR8jwJgKstPHoaw==",
    "x_gm_gg": "ASbGncsS/H9+bgGtDW2vqyakQxM7qarpYeJaZIqqHEO3YjQ/lgiV49jT2tVNwF6bv8w\tlokO5KXaBfIxZ+hverV0H7d5W8rvMkfX02ooLA1vim3HZj37y98RRA/+my+fojGpksveeCwZwjg\t5PMabGsD7RxFXl5Mqi7sPoMTJbuFRUke9L/z8uhw4qrw==",
    "x_google_smtp_source": "AGHT+IGVYm2HyyXPWAEQZ/cAL/lF+dgGC+IALkztr0rzyyoi71AFyEW6FRIHNgb562Zf3jvTcycrFo0sHwooLBIvMXo=",
    "x_received": "by 2002:a05:6122:288f:b0:52f:2a3:4bd6 with SMTP id 71dfb90a1353d-5314956ff81mr13605176e0c.3.1750278463552; Wed, 18 Jun 2025 13:27:43 -0700 (PDT)",
    "x_gm_features": "Ac12FXxTh2pIHsXi7UTjAloAhKL4FgRKyzzaDt_acprDPwd6nQ3TF4E_pUfSxMI"
  },
  "envelope": {
    "to": "e8ed92208ee6393951e7@cloudmailin.net",
    "recipients": ["e8ed92208ee6393951e7@cloudmailin.net"],
    "from": "steve@curvenote.com",
    "helo_domain": "mail-vk1-f182.google.com",
    "remote_ip": "209.85.221.182",
    "tls": true,
    "tls_cipher": "TLSv1.3",
    "md5": "2030851ec6f70af9e230f073a7c60aaf",
    "spf": {
      "result": "pass",
      "domain": "curvenote.com"
    }
  },
  "plain": "*WARNING*\r\n\r\nWarning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted\r\nwith the following problem(s): \"Grant 5R33MH125126-04 was not found. Please\r\nconfirm that this is a valid award from Authority and contact the Help Desk\r\nfor assistance.\".\r\n\r\n\r\n���\r\n",
  "html": "<div dir=\"ltr\"><div><table border=\"0\" cellspacing=\"0\" cellpadding=\"0\" width=\"100%\" style=\"width:593px;border-collapse:collapse;max-width:100%\"><tbody><tr style=\"break-inside:avoid\"><td nowrap valign=\"top\" style=\"border-width:1pt;border-style:solid;border-color:rgb(221,221,221) black black;background:rgb(240,173,78);padding:6pt;border-radius:0.25em\"><p class=\"MsoNormal\" align=\"center\" style=\"margin-bottom:15pt;text-align:center\"><b><span style=\"font-size:9pt;color:white\">WARNING<u></u><u></u></span></b></p></td><td valign=\"top\" style=\"border-right:none;border-bottom:none;border-left:none;border-top:1pt solid rgb(221,221,221);padding:6pt\"><p class=\"MsoNormal\" style=\"margin-bottom:15pt\"><span style=\"font-size:12pt\">Warning: Package ID=191e5fc4eea for Manuscript ID 1502493 was submitted with the following problem(s): &quot;Grant 5R33MH125126-04 was not found. Please confirm that this is a valid award from Authority and contact the Help Desk for assistance.&quot;.<u></u><u></u></span></p></td></tr></tbody></table><p class=\"MsoNormal\"><span style=\"font-size:12pt\"><u></u>��</span></p></div></div><div hspace=\"streak-pt-mark\" style=\"max-height:1px\"><img alt=\"\" style=\"width:0px;max-height:0px;overflow:hidden\" src=\"https://mailfoogae.appspot.com/t?sender=ac3RldmVAY3VydmVub3RlLmNvbQ%3D%3D&amp;type=zerocontent&amp;guid=8f8593f2-337b-4c84-9793-81c3cd6d6125\"><font color=\"#ffffff\" size=\"1\">���</font></div>\r\n",
  "reply_plain": null,
  "attachments": []
}
```
