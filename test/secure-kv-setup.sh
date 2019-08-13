#/bin/sh

# A script for setting up, stopping and starting a simple secure store
#  Usage:
#     secure-kv-setup { init | stop | start } [ <options> ]
#        init -jar <jarfile> -root <kvroot> -store <storename>
#             -host <hostname> -port <registry port> -admin <admin port>
#        stop -jar <jarfile> -root <kvroot>
#        start -jar <jarfile> -root <kvroot>
#        admin -jar <jarfile> -root <kvroot> -host <hostname>
#              -port <registry port>
#

# configurable through command line arguments
ACTION=
KVROOT=
KV_NAME=
KVSTOREJAR=
KV_REGPORT=
KV_ADMINPORT=
KV_HOST=localhost

# Configure via editing only
KV_TEST_USER=user1
KV_TEST_PW=testing
KV_SN=1
KV_CAP=1
KV_CPUS=1
KV_MEM=200
KV_POOL=mypool
KV_DC=mydc
KV_TOPO=mytopo
KV_HARANGE=5890,5900
# set these below
CLIENTJVMARGS=

# support code follows

usage() {
    echo "Usage: secure-kv-setup { init | stop | start | admin } [ <options> ]"
    echo "  init -jar <jarfile> -root <kvroot> -store <storename>"
    echo "       -host <hostname> -port <registry port> -admin <admin port>"
    echo "  stop -jar <jarfile> -root <kvroot>"
    echo "  start -jar <jarfile> -root <kvroot>"
    echo "  admin -jar <jarfile> -root <kvroot> -host <hostname>"
    echo "        -port <registry port>"
    exit 1
}

require_vars() {
    required=$1
    if [ -z "$required" ]; then
        return
    fi
    required_list=`echo $required | sed -e 's/,/ /g'`

    bad=

    for var in $required_list; do
        case $var in
            KVROOT)
               check_var "$KVROOT" "-root"
               if [ ! -d $KVROOT ]; then
                   error "the -kvroot argument $KVROOT does not exist or is not a directory"
               fi
               ;;
            KVSTOREJAR)
               check_var "$KVSTOREJAR" "-jar"
               if [ ! -f $KVSTOREJAR ]; then
                   error "the -jar argument $KVSTOREJAR does not exist or is not a file"
               fi
               ;;
            KV_NAME)
                check_var "$KV_NAME" "-store"
                ;;
            KV_HOST)
                check_var "$KV_HOST" "-host"
                ;;
            KV_REGPORT)
                check_var "$KV_REGPORT" "-port"
                ;;
            KV_ADMINPORT)
                check_var "$KV_ADMINPORT" "-admin"
                ;;
            *)
                echo "unknown variable $var";
                exit 1
                ;;
        esac
        if [ $? -ne 0 ]; then
            bad=1
        fi
    done
    if [ -n "$bad" ]; then
        exit 1
    fi
}

error() {
    echo $1
    exit 1
}

check_var() {
    var=$1
    opt=$2
    if [ -z "$var" ]; then
        error "the $opt option was not specified"
    fi
    return 0
}

update_clientjvmargs() {
   if [ -d $KVROOT/security ]; then
      CLIENTJVMARGS="-Doracle.kv.security=$KVROOT/security/client.security"
   else
      CLIENTJVMARGS=
   fi
}

# check that the root directory is empty
do_root_init() {
    if [ ! -d ${KVROOT} ]; then
        echo "The KVROOT directory ${KVROOT} does not exist"
        exit 1
    fi

    if [ -f ${KVROOT}/config.xml -o -d ${KVROOT}/security ]; then
        echo "The KVROOT directory ${KVROOT} is not empty"
        exit 1
    fi
}

do_bootconfig() {
  echo "Boot configuration";
    java ${JVMARGS} -jar ${KVSTOREJAR} makebootconfig \
	-root ${KVROOT} -port ${KV_REGPORT} \
	-store-security configure -kspwd letmein -pwdmgr pwdfile \
	-admin ${KV_ADMINPORT} -host ${KV_HOST} -harange $KV_HARANGE \
	-capacity ${KV_CAP}  -num_cpus ${KV_CPUS}  -memory_mb ${KV_MEM}
    update_clientjvmargs;
}

do_startconfig() {
  echo "Start store";
    nohup java ${JVMARGS} -jar ${KVSTOREJAR} start -root ${KVROOT} &
    sleep 10
}

do_finalconfig() {
  echo "Final configuration";
    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} runadmin \
         -port ${KV_REGPORT} -host ${KV_HOST} <<EOF
    configure -name ${KV_NAME}
    plan deploy-zone -name ${KV_DC} -wait -rf 1

    plan deploy-sn -zn zn1 -port ${KV_REGPORT} -wait -host ${KV_HOST}
    plan deploy-admin -sn sn1 -port ${KV_ADMINPORT} -wait

    pool create -name ${KV_POOL}
    pool join -name ${KV_POOL} -sn sn1

    topology create -name ${KV_TOPO} -pool ${KV_POOL} -partitions 30
    plan deploy-topology -name ${KV_TOPO} -wait


    quit
EOF
}

do_create_test_user() {
  echo "Creating test user";
    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} \
    runadmin -host ${KV_HOST} -port ${KV_REGPORT} <<EOF
plan create-user -name ${KV_TEST_USER} -admin -password ${KV_TEST_PW} -wait
plan grant -user ${KV_TEST_USER} -role readwrite -wait
quit
EOF
    echo "created user ${KV_TEST_USER} with password ${KV_TEST_PW}"
}

# top-level command subs

do_stop() {
    require_vars "KVROOT,KVSTOREJAR"
    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} stop -root ${KVROOT}
}

do_init() {
    require_vars "KVROOT,KVSTOREJAR,KV_NAME,KV_HOST,KV_REGPORT,KV_ADMINPORT"
    do_stop
    do_root_init
    do_bootconfig
    do_startconfig
    do_finalconfig
    do_create_test_user
    do_security
    echo "All steps done.";
    exit 0
}

do_start() {
    require_vars "KVROOT,KVSTOREJAR"
    nohup java ${JVMARGS} -jar ${KVSTOREJAR} start -root ${KVROOT} &
}

do_ping() {
    require_vars "KVROOT,KVSTOREJAR,KV_HOST"
    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} ping -port ${KV_REGPORT} -host ${KV_HOST}
}

do_admin() {
    require_vars "KVSTOREJAR,KV_REGPORT,KV_HOST,KVROOT"
    update_clientjvmargs;
    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} runadmin -port ${KV_REGPORT} -host ${KV_HOST}
}

do_security() {
  echo "Creating security";
    require_vars "KVSTOREJAR"
    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} securityconfig \
        pwdfile create -file ${KVROOT}/security/login.passwd

    java ${CLIENTJVMARGS} -jar ${KVSTOREJAR} securityconfig \
        pwdfile secret \
        -file ${KVROOT}/security/login.passwd -set -alias ${KV_TEST_USER} <<EOF
${KV_TEST_PW}
${KV_TEST_PW}
EOF

  echo 'oracle.kv.auth.username='${KV_TEST_USER} >>${KVROOT}/security/client.security
  echo 'oracle.kv.auth.pwdfile.file='${KVROOT}'/security/login.passwd' >>${KVROOT}/security/client.security
}

##########################################################
#   COMMAND LINE PROCESSING
##########################################################

#set -x
if [ $# -eq 0 ]; then
    usage;
fi

ACTION=$1
shift

# expect pairs of arguments
while [ $# -gt 1 ]; do
    arg=$1
    shift
    value=$1
    shift

    case $arg in
    -root)
      KVROOT=$value;;
    -jar)
      KVSTOREJAR=$value;;
    -store)
      KV_NAME=$value;;
    -host)
      KV_HOST=$value;;
    -port)
      KV_REGPORT=$value;;
    -admin)
      KV_ADMINPORT=$value;;
    -haRange)
      KV_HARANGE=$value;;
    *)
      echo "unrecognized option $arg"
      usage
      exit 1;;
    esac
done

case $ACTION in
    init)
       do_init;;
    stop)
       do_stop;;
    start)
       do_start;;
    admin)
       do_admin;;
    *)
        echo "unknown command $ACTION"
        usage;;
esac

exit 0
