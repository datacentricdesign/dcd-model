CREATE DATABASE IF NOT EXISTS `dcdhub`;

USE dcdhub;

CREATE TABLE IF NOT EXISTS `entity_types` (
                                              `id`   TINYINT PRIMARY KEY,
                                              `name` VARCHAR(10)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;


CREATE TABLE IF NOT EXISTS `persons` (
                                         `id`       VARCHAR(100) NOT NULL,
                                         `name`     VARCHAR(100) NOT NULL,
                                         `password` VARCHAR(64)  NOT NULL,
                                         `registered_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                         `unregistered_at` TIMESTAMP    NULL     DEFAULT NULL,
                                         CONSTRAINT `pk_persons_id` PRIMARY KEY (`id`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `things` (
                                        `id`   VARCHAR(100) NOT NULL UNIQUE,
                                        `name` VARCHAR(100) NOT NULL,
                                        `description` TEXT         NULL,
                                        `type` VARCHAR(30)  NOT NULL,
                                        `registered_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        `unregistered_at` TIMESTAMP    NULL     DEFAULT NULL,
                                        CONSTRAINT `pk_things_id` PRIMARY KEY (`id`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `interactions` (
                                              `id`            VARCHAR(100) NOT NULL UNIQUE,
                                              `entity_id_1`   VARCHAR(100) NOT NULL,
                                              `entity_id_2`   VARCHAR(100) NOT NULL,
                                              CONSTRAINT `pk_interactions_id` PRIMARY KEY (`id`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `properties` (
                                            `id`              VARCHAR(100)     NOT NULL,
                                            `index_id`        INT(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
                                            `name`            VARCHAR(100)     NOT NULL,
                                            `description`            TEXT             NULL,
                                            `type`            VARCHAR(30)      NOT NULL,
                                            `registered_at`   TIMESTAMP        NOT NULL        DEFAULT CURRENT_TIMESTAMP,
                                            `unregistered_at` TIMESTAMP        NULL            DEFAULT NULL,
                                            `entity_id`       VARCHAR(100)     NOT NULL,
                                            CONSTRAINT `pk_properties` PRIMARY KEY (`id`, `entity_id`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `dimensions` (
                                            `id`                INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                                            `name`              VARCHAR(100)     NOT NULL,
                                            `description`              TEXT             NULL,
                                            `unit`              VARCHAR(100)     NOT NULL,
                                            `property_index_id` INT(11) UNSIGNED NOT NULL,
                                            CONSTRAINT `pk_dimentions_id` PRIMARY KEY (`id`),
                                            CONSTRAINT `fk_dimensions_property_id` FOREIGN KEY (`property_index_id`)
                                                REFERENCES `properties` (`index_id`)
                                                ON DELETE CASCADE
                                                ON UPDATE CASCADE
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `classes` (
                                         `id`                INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                                         `name`              VARCHAR(100)     NOT NULL,
                                         `description`       TEXT             NULL,
                                         `value`             INT(11)          NOT NULL,
                                         `property_id`       VARCHAR(100)     NOT NULL,
                                         CONSTRAINT `pk_classes_id` PRIMARY KEY (`id`),
                                         CONSTRAINT `fk_classes_property_id` FOREIGN KEY (`property_id`)
                                             REFERENCES `properties` (`id`)
                                             ON DELETE CASCADE
                                             ON UPDATE CASCADE
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d1` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `dtext` (
                                       `property_index_id` INT(11) UNSIGNED NOT NULL,
                                       `timestamp`         BIGINT(15)       NOT NULL,
                                       `value1`            TEXT        NOT NULL,
                                       PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d2` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d3` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d4` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    `value4`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d5` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    `value4`            FLOAT(11)        NOT NULL,
                                    `value5`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d6` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    `value4`            FLOAT(11)        NOT NULL,
                                    `value5`            FLOAT(11)        NOT NULL,
                                    `value6`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d7` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    `value4`            FLOAT(11)        NOT NULL,
                                    `value5`            FLOAT(11)        NOT NULL,
                                    `value6`            FLOAT(11)        NOT NULL,
                                    `value7`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d8` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    `value4`            FLOAT(11)        NOT NULL,
                                    `value5`            FLOAT(11)        NOT NULL,
                                    `value6`            FLOAT(11)        NOT NULL,
                                    `value7`            FLOAT(11)        NOT NULL,
                                    `value8`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d9` (
                                    `property_index_id` INT(11) UNSIGNED NOT NULL,
                                    `timestamp`         BIGINT(15)       NOT NULL,
                                    `value1`            FLOAT(11)        NOT NULL,
                                    `value2`            FLOAT(11)        NOT NULL,
                                    `value3`            FLOAT(11)        NOT NULL,
                                    `value4`            FLOAT(11)        NOT NULL,
                                    `value5`            FLOAT(11)        NOT NULL,
                                    `value6`            FLOAT(11)        NOT NULL,
                                    `value7`            FLOAT(11)        NOT NULL,
                                    `value8`            FLOAT(11)        NOT NULL,
                                    `value9`            FLOAT(11)        NOT NULL,
                                    PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d10` (
                                     `property_index_id` INT(11) UNSIGNED NOT NULL,
                                     `timestamp`         BIGINT(15)       NOT NULL,
                                     `value1`            FLOAT(11)        NOT NULL,
                                     `value2`            FLOAT(11)        NOT NULL,
                                     `value3`            FLOAT(11)        NOT NULL,
                                     `value4`            FLOAT(11)        NOT NULL,
                                     `value5`            FLOAT(11)        NOT NULL,
                                     `value6`            FLOAT(11)        NOT NULL,
                                     `value7`            FLOAT(11)        NOT NULL,
                                     `value8`            FLOAT(11)        NOT NULL,
                                     `value9`            FLOAT(11)        NOT NULL,
                                     `value10`           FLOAT(11)        NOT NULL,
                                     PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d11` (
                                     `property_index_id` INT(11) UNSIGNED NOT NULL,
                                     `timestamp`         BIGINT(15)       NOT NULL,
                                     `value1`            FLOAT(11)        NOT NULL,
                                     `value2`            FLOAT(11)        NOT NULL,
                                     `value3`            FLOAT(11)        NOT NULL,
                                     `value4`            FLOAT(11)        NOT NULL,
                                     `value5`            FLOAT(11)        NOT NULL,
                                     `value6`            FLOAT(11)        NOT NULL,
                                     `value7`            FLOAT(11)        NOT NULL,
                                     `value8`            FLOAT(11)        NOT NULL,
                                     `value9`            FLOAT(11)        NOT NULL,
                                     `value10`           FLOAT(11)        NOT NULL,
                                     `value11`           FLOAT(11)        NOT NULL,
                                     PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d12` (
                                     `property_index_id` INT(11) UNSIGNED NOT NULL,
                                     `timestamp`         BIGINT(15)       NOT NULL,
                                     `value1`            FLOAT(11)        NOT NULL,
                                     `value2`            FLOAT(11)        NOT NULL,
                                     `value3`            FLOAT(11)        NOT NULL,
                                     `value4`            FLOAT(11)        NOT NULL,
                                     `value5`            FLOAT(11)        NOT NULL,
                                     `value6`            FLOAT(11)        NOT NULL,
                                     `value7`            FLOAT(11)        NOT NULL,
                                     `value8`            FLOAT(11)        NOT NULL,
                                     `value9`            FLOAT(11)        NOT NULL,
                                     `value10`           FLOAT(11)        NOT NULL,
                                     `value11`           FLOAT(11)        NOT NULL,
                                     `value12`           FLOAT(11)        NOT NULL,
                                     PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d13` (
                                     `property_index_id` INT(11) UNSIGNED NOT NULL,
                                     `timestamp`         BIGINT(15)       NOT NULL,
                                     `value1`            FLOAT(11)        NOT NULL,
                                     `value2`            FLOAT(11)        NOT NULL,
                                     `value3`            FLOAT(11)        NOT NULL,
                                     `value4`            FLOAT(11)        NOT NULL,
                                     `value5`            FLOAT(11)        NOT NULL,
                                     `value6`            FLOAT(11)        NOT NULL,
                                     `value7`            FLOAT(11)        NOT NULL,
                                     `value8`            FLOAT(11)        NOT NULL,
                                     `value9`            FLOAT(11)        NOT NULL,
                                     `value10`           FLOAT(11)        NOT NULL,
                                     `value11`           FLOAT(11)        NOT NULL,
                                     `value12`           FLOAT(11)        NOT NULL,
                                     `value13`           FLOAT(11)        NOT NULL,
                                     PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d14` (
                                     `property_index_id` INT(11) UNSIGNED NOT NULL,
                                     `timestamp`         BIGINT(15)       NOT NULL,
                                     `value1`            FLOAT(11)        NOT NULL,
                                     `value2`            FLOAT(11)        NOT NULL,
                                     `value3`            FLOAT(11)        NOT NULL,
                                     `value4`            FLOAT(11)        NOT NULL,
                                     `value5`            FLOAT(11)        NOT NULL,
                                     `value6`            FLOAT(11)        NOT NULL,
                                     `value7`            FLOAT(11)        NOT NULL,
                                     `value8`            FLOAT(11)        NOT NULL,
                                     `value9`            FLOAT(11)        NOT NULL,
                                     `value10`           FLOAT(11)        NOT NULL,
                                     `value11`           FLOAT(11)        NOT NULL,
                                     `value12`           FLOAT(11)        NOT NULL,
                                     `value13`           FLOAT(11)        NOT NULL,
                                     `value14`           FLOAT(11)        NOT NULL,
                                     PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `d15` (
                                     `property_index_id` INT(11) UNSIGNED NOT NULL,
                                     `timestamp`         BIGINT(15)       NOT NULL,
                                     `value1`            FLOAT(11)        NOT NULL,
                                     `value2`            FLOAT(11)        NOT NULL,
                                     `value3`            FLOAT(11)        NOT NULL,
                                     `value4`            FLOAT(11)        NOT NULL,
                                     `value5`            FLOAT(11)        NOT NULL,
                                     `value6`            FLOAT(11)        NOT NULL,
                                     `value7`            FLOAT(11)        NOT NULL,
                                     `value8`            FLOAT(11)        NOT NULL,
                                     `value9`            FLOAT(11)        NOT NULL,
                                     `value10`           FLOAT(11)        NOT NULL,
                                     `value11`           FLOAT(11)        NOT NULL,
                                     `value12`           FLOAT(11)        NOT NULL,
                                     `value13`           FLOAT(11)        NOT NULL,
                                     `value14`           FLOAT(11)        NOT NULL,
                                     `value15`           FLOAT(11)        NOT NULL,
                                     PRIMARY KEY (`property_index_id`, `timestamp`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;

CREATE TABLE IF NOT EXISTS `roles` (
                                       `id`                INT(11) UNSIGNED NOT NULL UNIQUE AUTO_INCREMENT,
                                       `subject_entity_id` VARCHAR(100) NOT NULL,
                                       `actor_entity_id`   VARCHAR(100) NOT NULL,
                                       `role`              VARCHAR(20)  NOT NULL,
                                       PRIMARY KEY (`id`),
                                       CONSTRAINT `unique_roles` UNIQUE (`subject_entity_id`, `actor_entity_id`, `role`)
)
    ENGINE = INNODB
    DEFAULT CHARSET = LATIN1;
