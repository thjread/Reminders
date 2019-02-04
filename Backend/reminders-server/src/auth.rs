use oauth2::prelude::*;
use oauth2::{
    AuthorizationCode,
    AuthUrl,
    ClientId,
    ClientSecret,
    CsrfToken,
    RedirectUrl,
    Scope,
    TokenUrl
};
use oauth2::basic::{BasicClient, BasicTokenResponse, BasicRequestTokenError};
use url::Url;
use serde_derive::Deserialize;
use serde_json;
use std::error::Error;
use std::fs::File;
use std::io::BufReader;

#[derive(Deserialize, Debug)]
struct WebCredentials {
    client_id: String,
    project_id: String,
    #[serde(with = "url_serde")]
    auth_uri: Url,
    #[serde(with = "url_serde")]
    token_uri: Url,
    #[serde(with = "url_serde")]
    auth_provider_x509_cert_url: Url,
    client_secret: String,
}

#[derive(Deserialize, Debug)]
struct Credentials {
    web: WebCredentials,
}

pub fn load_google_credentials() -> Result<BasicClient, Box<Error>> {
    let file = File::open("secrets/client_secret_1051432813119-3tlshk1cguic32q4bvq8l2b6soab919p.apps.googleusercontent.com.json")?;
    let reader = BufReader::new(file);

    let creds: Credentials = serde_json::from_reader(reader)?;

    let client =
        BasicClient::new(
            ClientId::new(creds.web.client_id),
            Some(ClientSecret::new(creds.web.client_secret)),
            AuthUrl::new(creds.web.auth_uri),
            Some(TokenUrl::new(creds.web.token_uri))
        )
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new("openid".to_string()))
        //.add_scope(Scope::new("write".to_string()))
        .set_redirect_url(RedirectUrl::new(Url::parse("http://localhost:8000/")?));
    Ok(client)
}

pub fn get_auth_url(client: &BasicClient) -> (Url, CsrfToken) {
    // Generate the full authorization URL.
    client.authorize_url(CsrfToken::new_random)
}

pub fn get_token(client: &BasicClient) -> () {//Result<BasicTokenResponse, BasicRequestTokenError> {
    // Once the user has been redirected to the redirect URL, you'll have access to the
    // authorization code. For security reasons, your code should verify that the `state`
    // parameter returned by the server matches `csrf_state`.

    // Now you can trade it for an access token.
    //let token_result =
    //    client.exchange_code(AuthorizationCode::new("4/5gAZefQiVGdjGnyff5kSHwzvIW_10SUs1oLG4F3qeNYa0Rc1J-2cdhFvw-P8k_XTWVr42f_MowMBRMaPoUU_7RQ".to_string()));

    // Unwrapping token_result will either produce a Token or a RequestTokenError.

    //return token_result;
    return ();
}
