package com.clinica.bot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })
@ComponentScan(basePackages = "com.clinica.bot")
public class ClinicaBotApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClinicaBotApplication.class, args);
    }
}