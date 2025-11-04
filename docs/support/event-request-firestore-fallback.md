# Event request form update (plain-language summary)

We adjusted the event request form so that it can still send your details to our team even when our Google database is temporarily unreachable. Instead of the page crashing with a server error, the form now finishes as usual and lets us know what you submitted. Behind the scenes we simply skip the optional database step whenever it is unavailable and log a warning for the team to look at later.
