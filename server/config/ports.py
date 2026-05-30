SENSITIVE_PORTS = {
    22:    "SSH",
    3389:  "RDP",
    3306:  "MySQL",
    5432:  "PostgreSQL",
    27017: "MongoDB",
    6379:  "Redis",
    9200:  "Elasticsearch",
    9300:  "Elasticsearch (cluster)",
    2379:  "etcd",
    2380:  "etcd (peer)",
    445:   "SMB",
    1433:  "MSSQL",
    1521:  "Oracle DB",
    5984:  "CouchDB",
    8080:  "HTTP Alt",
    8443:  "HTTPS Alt",
}

OPEN_CIDR = ["0.0.0.0/0", "::/0"]